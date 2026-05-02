import { useState, useRef, useEffect, useCallback } from "react";
import {
  useListThreats,
  useListAgents,
  useListMissions,
  useGetThreatsSummary,
  useGetAgentsSummary,
  useListDetections,
  useListIncidents,
} from "@workspace/api-client-react";
import {
  Bot,
  Send,
  X,
  Loader2,
  AlertTriangle,
  Shield,
  Cpu,
  RotateCcw,
  Copy,
  Check,
  ChevronDown,
  Zap,
  FileCode2,
  Siren,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SYSTEM_PROMPT = `You are the Rapid Force AI Copilot — an autonomous cybersecurity analyst embedded in the Cyber Fusion command center. You have real-time access to the platform's operational data.

You follow the Rapid Force principles: AI First, Detection as Code, Automation by Default, Zero Trust Design, Intelligence-Driven Response.

Formatting rules:
- Use **bold** for important terms, threat names, and key findings
- Use \`code\` for technical values, IDs, ATT&CK techniques, and commands
- Use bullet points (lines starting with - ) for lists
- Keep responses concise, tactical, and actionable
- Reference MITRE ATT&CK techniques when relevant (e.g. \`T1003.001\`)
- For playbooks, use numbered steps`;

const SUGGESTED = [
  { icon: "⚠", text: "Analyze the current critical threats" },
  { icon: "🤖", text: "Which agents should I assign to active incidents?" },
  { icon: "🔍", text: "What detection rules should I create for the top threats?" },
  { icon: "📊", text: "Summarize the current security posture" },
  { icon: "📋", text: "Generate an incident response playbook" },
  { icon: "🎯", text: "Map active threats to MITRE ATT&CK techniques" },
];

const QUICK_ACTIONS = [
  { label: "Security Posture", icon: Shield, query: "Give me a concise security posture summary with risk level and top priorities" },
  { label: "Active Threats", icon: AlertTriangle, query: "List and analyze all active critical threats with recommended immediate actions" },
  { label: "Detection Gaps", icon: FileCode2, query: "Identify gaps in our current detection coverage based on active threats" },
  { label: "Incident Triage", icon: Siren, query: "Triage open incidents by severity and recommend response priorities" },
];

interface Props {
  onClose: () => void;
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      result.push(
        <pre key={i} className="my-2 bg-muted/50 border border-border px-3 py-2 text-xs font-mono overflow-x-auto rounded-sm">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
    } else if (line.startsWith("### ")) {
      result.push(<p key={i} className="text-xs font-bold text-primary font-mono tracking-wider mt-3 mb-1">{line.slice(4)}</p>);
    } else if (line.startsWith("## ")) {
      result.push(<p key={i} className="text-sm font-bold text-foreground mt-3 mb-1">{line.slice(3)}</p>);
    } else if (line.match(/^\d+\.\s/)) {
      result.push(
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-primary font-mono text-xs shrink-0">{line.match(/^\d+/)![0]}.</span>
          <span className="text-sm">{renderInline(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      result.push(
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-primary font-mono text-xs shrink-0 mt-0.5">▸</span>
          <span className="text-sm">{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.trim() === "") {
      result.push(<div key={i} className="h-2" />);
    } else {
      result.push(<p key={i} className="text-sm leading-relaxed">{renderInline(line)}</p>);
    }
    i++;
  }

  return <>{result}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="bg-primary/10 text-primary font-mono text-xs px-1 py-0.5 rounded-sm">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1"
      title="Copy message"
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
      <span className="text-xs font-mono text-muted-foreground ml-1">Analyzing...</span>
    </div>
  );
}

export default function CopilotPanel({ onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: threats } = useListThreats();
  const { data: agents } = useListAgents();
  const { data: missions } = useListMissions();
  const { data: threatsSummary } = useGetThreatsSummary();
  const { data: agentsSummary } = useGetAgentsSummary();
  const { data: detections } = useListDetections();
  const { data: incidents } = useListIncidents();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isStreaming) inputRef.current?.focus();
  }, [isStreaming]);

  const buildContext = () => {
    const activeThreats = threats?.filter((t) => t.status === "active") ?? [];
    const criticalThreats = threats?.filter((t) => t.severity === "critical") ?? [];
    const activeAgents = agents?.filter((a) => a.status === "active") ?? [];
    const activeMissions = missions?.filter((m) => m.status === "active") ?? [];
    const openIncidents = incidents?.filter((inc) => inc.status === "open" || inc.status === "investigating") ?? [];
    const activeDetections = detections?.filter((d) => d.status === "active") ?? [];

    return `LIVE OPERATIONAL CONTEXT (${new Date().toISOString()}):

THREAT INTELLIGENCE:
- Total: ${threatsSummary?.total ?? "?"} (Critical: ${threatsSummary?.critical ?? 0}, High: ${threatsSummary?.high ?? 0}, Active: ${threatsSummary?.active ?? 0}, Mitigated: ${threatsSummary?.mitigated ?? 0})
- Critical threats: ${criticalThreats.map((t) => `"${t.title}" [${t.status}]`).join(", ") || "None"}
- Active threats: ${activeThreats.map((t) => `"${t.title}" (${t.severity})`).join(", ") || "None"}

INCIDENT RESPONSE:
- Open/Investigating incidents (${openIncidents.length}): ${openIncidents.map((i) => `"${i.title}" [${i.severity}]`).join(", ") || "None"}

DETECTION ENGINEERING:
- Active detection rules: ${activeDetections.length} of ${detections?.length ?? 0} total
- Rule types: ${["sigma", "yara", "ioc", "behavioral", "query"].map((type) => `${type.toUpperCase()}: ${detections?.filter((d) => d.type === type).length ?? 0}`).join(", ")}

AGENT FLEET:
- Total: ${agentsSummary?.total ?? "?"} agents (Active: ${agentsSummary?.active ?? 0}, Idle: ${agentsSummary?.idle ?? 0})
- Active agents: ${activeAgents.map((a) => `${a.name} (${a.role})`).join(", ") || "None"}

ACTIVE MISSIONS (${activeMissions.length}):
${activeMissions.slice(0, 5).map((m) => `- [${m.priority.toUpperCase()}] ${m.title} (${m.category})`).join("\n") || "None"}`;
  };

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isStreaming) return;

    setShowQuickActions(false);
    const newUserMsg: Message = { role: "user", content: userMessage, timestamp: new Date() };
    const updated = [...messages, newUserMsg];
    setMessages(updated);
    setInput("");
    setIsStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "", timestamp: new Date() };
    setMessages([...updated, assistantMsg]);

    abortRef.current = new AbortController();

    try {
      const context = buildContext();
      const chatMessages = [
        { role: "system" as const, content: `${SYSTEM_PROMPT}\n\n${context}` },
        ...updated.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const resp = await fetch(`${BASE}/api/copilot/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatMessages }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) throw new Error("Copilot request failed");
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulated += data.content;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { ...copy[copy.length - 1], content: accumulated };
                  return copy;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            content: "⚠ Copilot connection failed. Check API server status.",
          };
          return copy;
        });
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const handleClear = () => {
    setMessages([]);
    setIsStreaming(false);
    setShowQuickActions(true);
    abortRef.current?.abort();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const activeThreats = threats?.filter((t) => t.status === "active").length ?? 0;
  const openIncidents = incidents?.filter((i) => i.status === "open").length ?? 0;
  const criticalCount = threats?.filter((t) => t.severity === "critical" && t.status === "active").length ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0 bg-card">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-7 w-7 items-center justify-center bg-primary/20 border border-primary/40">
            <Bot className="h-4 w-4 text-primary" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide">AI COPILOT</div>
            <div className="text-xs font-mono text-primary/70">Rapid Force Analyst · Live</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground px-2 py-1 border border-border hover:border-primary/50 transition-colors"
              title="Clear conversation"
            >
              <RotateCcw className="h-3 w-3" />
              CLEAR
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Context status bar */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-border shrink-0 bg-card/50">
        <span
          className={cn(
            "flex items-center gap-1 text-[10px] font-mono border px-1.5 py-0.5",
            criticalCount > 0
              ? "text-destructive border-destructive/40 bg-destructive/10"
              : "text-muted-foreground border-border"
          )}
        >
          <AlertTriangle className="h-2.5 w-2.5" />
          {activeThreats} THREATS
          {criticalCount > 0 && <span className="text-destructive font-bold">· {criticalCount} CRIT</span>}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-mono border border-primary/30 bg-primary/5 text-primary px-1.5 py-0.5">
          <Cpu className="h-2.5 w-2.5" />
          {agents?.filter((a) => a.status === "active").length ?? 0} AGENTS
        </span>
        <span className="flex items-center gap-1 text-[10px] font-mono border border-accent/30 bg-accent/5 text-accent px-1.5 py-0.5">
          <Siren className="h-2.5 w-2.5" />
          {openIncidents} OPEN INC.
        </span>
        <span className="flex items-center gap-1 text-[10px] font-mono border border-border text-muted-foreground px-1.5 py-0.5">
          <FileCode2 className="h-2.5 w-2.5" />
          {detections?.filter((d) => d.status === "active").length ?? 0} RULES
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="space-y-5 pt-2">
            {/* Welcome */}
            <div className="text-center py-4">
              <div className="flex h-12 w-12 mx-auto items-center justify-center bg-primary/10 border border-primary/30 mb-3">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div className="text-sm font-bold tracking-wide mb-1">RAPID FORCE AI ANALYST</div>
              <div className="text-xs font-mono text-muted-foreground">
                Live context loaded · {(threats?.length ?? 0) + (incidents?.length ?? 0) + (detections?.length ?? 0)} data points
              </div>
            </div>

            {/* Quick action buttons */}
            {showQuickActions && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-muted-foreground tracking-widest mb-2">QUICK ACTIONS</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.query)}
                      className="flex flex-col items-start gap-1 border border-border px-3 py-2.5 text-left hover:border-primary hover:bg-primary/5 transition-colors group"
                    >
                      <action.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested queries */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono text-muted-foreground tracking-widest">SUGGESTED QUERIES</div>
              {SUGGESTED.map((s) => (
                <button
                  key={s.text}
                  onClick={() => sendMessage(s.text)}
                  className="w-full text-left flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border px-3 py-2 hover:border-primary hover:text-primary transition-colors"
                >
                  <span className="shrink-0">{s.icon}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={cn("flex flex-col gap-1 group", msg.role === "user" ? "items-end" : "items-start")}>
              <div className={cn("text-[10px] font-mono mb-0.5 flex items-center gap-2", msg.role === "user" ? "text-muted-foreground" : "text-primary")}>
                {msg.role === "user" ? "YOU" : "COPILOT AI"}
                <span className="text-muted-foreground/40">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {msg.role === "assistant" && msg.content && <CopyButton text={msg.content} />}
              </div>
              <div
                className={cn(
                  "max-w-full",
                  msg.role === "user"
                    ? "bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-foreground"
                    : "text-foreground w-full"
                )}
              >
                {msg.role === "assistant" ? (
                  msg.content === "" && isStreaming && i === messages.length - 1 ? (
                    <TypingIndicator />
                  ) : (
                    <>
                      <MarkdownMessage content={msg.content} />
                      {isStreaming && i === messages.length - 1 && msg.content !== "" && (
                        <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse ml-0.5 align-text-bottom" />
                      )}
                    </>
                  )
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border px-4 py-3 shrink-0 bg-card/50">
        {/* Quick actions toggle when in conversation */}
        {messages.length > 0 && !isStreaming && (
          <div className="flex gap-1 mb-2 flex-wrap">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.query)}
                className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground border border-border px-2 py-1 hover:border-primary hover:text-primary transition-colors"
              >
                <Zap className="h-2.5 w-2.5" />
                {action.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={2}
            className="flex-1 bg-background border border-border px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:border-primary placeholder:text-muted-foreground transition-colors"
            placeholder="Ask the AI analyst... (Enter to send)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="flex h-9 w-9 items-center justify-center border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0"
              title="Stop"
            >
              <span className="h-2.5 w-2.5 bg-current" />
            </button>
          ) : (
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="flex h-9 w-9 items-center justify-center bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 transition-opacity shrink-0"
              title="Send (Enter)"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground/40 mt-1">
          Enter to send · Shift+Enter for newline · ⌘/ to toggle
        </div>
      </div>
    </div>
  );
}
