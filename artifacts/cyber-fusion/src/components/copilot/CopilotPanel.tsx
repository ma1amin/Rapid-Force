import { useState, useRef, useEffect } from "react";
import { useListThreats, useListAgents, useListMissions, useGetThreatsSummary, useGetAgentsSummary } from "@workspace/api-client-react";
import { Bot, Send, X, Loader2, AlertTriangle, Shield, Cpu, RotateCcw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SYSTEM_PROMPT = `You are the Rapid Force AI Copilot — an autonomous cybersecurity analyst embedded in the Cyber Fusion command center. You have access to live operational data about:
- Active threats and their severity/status
- AI agent fleet status and capabilities  
- Active missions and sprint operations
- Incident response playbooks and procedures

You follow the Rapid Force principles: AI First, Detection as Code, Automation by Default, Zero Trust Design, Intelligence-Driven Response.

Respond concisely in a professional, tactical style. When analyzing threats, reference MITRE ATT&CK techniques when relevant. When suggesting responses, provide specific actionable steps. Keep responses focused and operational.`;

const SUGGESTED = [
  "Analyze the current critical threats",
  "Which agents should I assign to active incidents?",
  "What detection rules should I create for the top threats?",
  "Summarize the current security posture",
  "Generate an incident response playbook",
];

interface Props {
  onClose: () => void;
}

export default function CopilotPanel({ onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: threats } = useListThreats();
  const { data: agents } = useListAgents();
  const { data: missions } = useListMissions();
  const { data: threatsSummary } = useGetThreatsSummary();
  const { data: agentsSummary } = useGetAgentsSummary();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContext = () => {
    const activeThreats = threats?.filter(t => t.status === "active") ?? [];
    const criticalThreats = threats?.filter(t => t.severity === "critical") ?? [];
    const activeAgents = agents?.filter(a => a.status === "active") ?? [];
    const activeMissions = missions?.filter(m => m.status === "active") ?? [];

    return `LIVE OPERATIONAL CONTEXT (as of ${new Date().toISOString()}):

THREAT INTELLIGENCE:
- Total threats: ${threatsSummary?.total ?? "unknown"} (Critical: ${threatsSummary?.critical ?? 0}, High: ${threatsSummary?.high ?? 0}, Active: ${threatsSummary?.active ?? 0}, Mitigated: ${threatsSummary?.mitigated ?? 0})
- Critical threats: ${criticalThreats.map(t => `[${t.id}] ${t.title} (${t.status})`).join(", ") || "None"}
- Active threats requiring attention: ${activeThreats.map(t => `${t.title} [${t.severity}]`).join(", ") || "None"}

AGENT FLEET:
- Total: ${agentsSummary?.total ?? "unknown"} agents (Active: ${agentsSummary?.active ?? 0}, Idle: ${agentsSummary?.idle ?? 0})
- Active agents: ${activeAgents.map(a => `${a.name} (${a.role}, ${a.module})`).join(", ") || "None"}

ACTIVE MISSIONS (${activeMissions.length}):
${activeMissions.slice(0, 5).map(m => `- [${m.priority.toUpperCase()}] ${m.title} (${m.category})`).join("\n") || "None"}`;
  };

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isStreaming) return;

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
        ...updated.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
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
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulated += data.content;
                setMessages(prev => {
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
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: "⚠ Copilot connection failed. Check API server status." };
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
    abortRef.current?.abort();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center bg-primary/20 border border-primary/40">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide">AI COPILOT</div>
            <div className="text-xs font-mono text-muted-foreground">Rapid Force Analyst</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={handleClear} className="text-muted-foreground hover:text-foreground" title="Clear">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Context pills */}
      <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-border shrink-0">
        {[
          { icon: <AlertTriangle className="h-2.5 w-2.5" />, label: `${threats?.filter(t => t.status === "active").length ?? 0} ACTIVE THREATS`, color: "text-destructive border-destructive/30 bg-destructive/5" },
          { icon: <Cpu className="h-2.5 w-2.5" />, label: `${agents?.filter(a => a.status === "active").length ?? 0} AGENTS LIVE`, color: "text-primary border-primary/30 bg-primary/5" },
          { icon: <Shield className="h-2.5 w-2.5" />, label: `${missions?.filter(m => m.status === "active").length ?? 0} MISSIONS`, color: "text-accent border-accent/30 bg-accent/5" },
        ].map(({ icon, label, color }) => (
          <span key={label} className={`flex items-center gap-1 text-xs font-mono border px-1.5 py-0.5 ${color}`}>
            {icon} {label}
          </span>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6">
              <Bot className="h-10 w-10 mx-auto text-primary/30 mb-3" />
              <div className="text-sm font-mono text-muted-foreground">Ready to analyze. Ask anything about your security posture.</div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-mono text-muted-foreground tracking-widest">SUGGESTED QUERIES</div>
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="w-full text-left text-xs font-mono text-muted-foreground border border-border px-3 py-2 hover:border-primary hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`text-xs font-mono mb-0.5 ${msg.role === "user" ? "text-muted-foreground" : "text-primary"}`}>
                {msg.role === "user" ? "ANALYST" : "COPILOT AI"}
              </div>
              <div
                className={`text-sm leading-relaxed max-w-full whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary/10 border border-primary/20 px-3 py-2 text-foreground"
                    : "text-foreground"
                }`}
              >
                {msg.content}
                {isStreaming && i === messages.length - 1 && msg.role === "assistant" && msg.content === "" && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" /> Analyzing...
                  </span>
                )}
                {isStreaming && i === messages.length - 1 && msg.role === "assistant" && msg.content !== "" && (
                  <span className="inline-block w-1 h-3.5 bg-primary animate-pulse ml-0.5" />
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={2}
            className="flex-1 bg-background border border-border px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:border-primary placeholder:text-muted-foreground"
            placeholder="Ask the AI analyst..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="flex h-9 w-9 items-center justify-center border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0"
            >
              <span className="h-3 w-3 bg-current" />
            </button>
          ) : (
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="flex h-9 w-9 items-center justify-center bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 transition-opacity shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="text-xs font-mono text-muted-foreground/40 mt-1">Enter to send · Shift+Enter for newline</div>
      </div>
    </div>
  );
}
