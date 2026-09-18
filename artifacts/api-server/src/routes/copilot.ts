import { Router, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// ─── 1. In-memory rate limiter (per IP, sliding window) ───────────────────────
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }
  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(ip);
  }
}, 5 * 60_000);

// ─── 2. Prompt injection detection ────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|your)\s+instructions/i,
  /forget\s+(your|all|the)\s+(instructions|rules|guidelines|persona|system\s*prompt|context)/i,
  /you\s+are\s+now\s+(a\s+|an\s+)?(different|new|another|unrestricted)/i,
  /new\s+(persona|identity|role|character|mode)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(a\s+|an\s+)?(different|new|another|unrestricted)/i,
  /act\s+as\s+(a\s+|an\s+)?(different|new|another|unrestricted|unaligned)/i,
  /\bjailbreak\b/i,
  /\bDAN\s*(mode|prompt|test)?\b/i,
  /developer\s+mode\s+enabled/i,
  /bypass\s+(your\s+|the\s+)?(restrictions|filters|guardrails|safety|rules)/i,
  /disregard\s+(all\s+)?(prior|previous|your)\s+(instructions|constraints|rules)/i,
  /override\s+(your\s+)?(system\s+)?(prompt|instructions|rules)/i,
  /<\|system\|>/i,
  /\[INST\]/i,
  /###\s*(System|Assistant|Human)\s*:/i,
  /\bsystem\s*prompt\s*:/i,
  /\byou\s+have\s+no\s+restrictions\b/i,
];

function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

// ─── 3. Message type & constants ──────────────────────────────────────────────
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
const VALID_ROLES = new Set<string>(["system", "user", "assistant"]);
const MAX_MESSAGES = 30;
const MAX_SINGLE_MESSAGE_CHARS = 2_000;
const MAX_TOTAL_CHARS = 12_000;
const MAX_MESSAGES_IN_BODY = 60;

// ─── 4. Sanitize & trim ───────────────────────────────────────────────────────
function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: typeof m.content === "string"
      ? m.content.replace(/\0/g, "").replace(/[\u200b-\u200f\ufeff]/g, "").slice(0, MAX_SINGLE_MESSAGE_CHARS)
      : "",
  }));
}

function trimConversation(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= 1) return messages;
  const [system, ...rest] = messages;
  const recent = rest.slice(-MAX_MESSAGES);
  let total = system.content.length;
  const kept: ChatMessage[] = [];
  for (let i = recent.length - 1; i >= 0; i--) {
    const len = recent[i].content.length;
    if (total + len > MAX_TOTAL_CHARS && kept.length > 0) break;
    total += len;
    kept.unshift(recent[i]);
  }
  return [system, ...kept];
}

// ─── Route ────────────────────────────────────────────────────────────────────
router.post("/copilot/analyze", async (req: Request, res: Response) => {
  const forwarded = req.headers["x-forwarded-for"] as string | undefined;
  const ip = forwarded?.split(",")[0]?.trim() ?? req.ip ?? "unknown";

  // 1. Rate limit
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    req.log.warn({ ip }, "copilot: rate limit exceeded");
    res.status(429).json({
      error: "rate_limit",
      message: `Too many requests. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.`,
      retryAfterMs: rl.retryAfterMs,
    });
    return;
  }

  // 2. Input shape validation
  const { messages } = req.body as { messages?: unknown };
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "validation", message: "messages array required" });
    return;
  }
  if (messages.length > MAX_MESSAGES_IN_BODY) {
    res.status(400).json({ error: "validation", message: "too many messages in request" });
    return;
  }
  for (const m of messages) {
    if (
      typeof m !== "object" || m === null ||
      !VALID_ROLES.has((m as any).role) ||
      typeof (m as any).content !== "string"
    ) {
      res.status(400).json({ error: "validation", message: "invalid message format" });
      return;
    }
  }

  const typed = messages as ChatMessage[];

  // 3. Prompt injection — scan user messages only
  for (const m of typed) {
    if (m.role === "user" && detectInjection(m.content)) {
      req.log.warn({ ip, snippet: m.content.slice(0, 100) }, "copilot: injection attempt blocked");
      res.status(400).json({
        error: "injection_detected",
        message: "Message blocked: disallowed manipulation pattern detected.",
      });
      return;
    }
  }

  // 4. Sanitize + trim conversation history
  const sanitized = sanitizeMessages(typed);
  const trimmed = trimConversation(sanitized);

  // 5. Audit log
  const lastUser = [...trimmed].reverse().find((m) => m.role === "user");
  req.log.info({
    ip,
    messagesKept: trimmed.length,
    lastUserLength: lastUser?.content.length ?? 0,
    rlCount: rateLimitStore.get(ip)?.count,
  }, "copilot: request");

  // 6. Stream response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 800,
      messages: trimmed,
      stream: true,
    });

    let outputChars = 0;
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        outputChars += content.length;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    req.log.info({ ip, outputChars }, "copilot: response complete");
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    req.log.error({ err, ip }, "copilot: AI error");
    res.write(`data: ${JSON.stringify({ error: "AI service error" })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
