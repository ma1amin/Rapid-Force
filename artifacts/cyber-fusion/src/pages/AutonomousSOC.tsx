import { useState, useEffect, useCallback, useRef } from "react";
import { Bot, Zap, Shield, Clock, CheckCircle, XCircle, AlertTriangle, ThumbsUp, ThumbsDown, RefreshCcw, Loader2, FileText, Play, Brain, Target, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AutonomousAction {
  id: number; type: string; title: string; description: string; status: string;
  incidentId: number | null; incidentTitle: string | null; riskLevel: string;
  reasoning: string; result: string | null; requiresApproval: boolean;
  approvedBy: string | null; confidence: number; executedAt: string | null; createdAt: string;
}

interface Briefing {
  id: number; title: string; period: string; summary: string;
  keyFindings: string[]; recommendations: string[]; metrics: Record<string, number>;
  generatedAt: string; content: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  triage: Brain, isolate: Shield, block_ip: Shield, quarantine: Shield,
  investigate: Target, notify: Activity, close: CheckCircle, escalate: AlertTriangle,
};

const TYPE_COLORS: Record<string, string> = {
  triage: "text-blue-400 border-blue-500/40 bg-blue-500/10",
  isolate: "text-red-400 border-red-500/40 bg-red-500/10",
  block_ip: "text-red-400 border-red-500/40 bg-red-500/10",
  quarantine: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  investigate: "text-purple-400 border-purple-500/40 bg-purple-500/10",
  notify: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
  close: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  escalate: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
};

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:           { color: "text-muted-foreground border-border",         label: "PENDING",     icon: Clock },
  executing:         { color: "text-yellow-400 border-yellow-500/40",        label: "EXECUTING",   icon: Loader2 },
  complete:          { color: "text-primary border-primary/40",              label: "COMPLETE",    icon: CheckCircle },
  approved:          { color: "text-emerald-400 border-emerald-500/40",      label: "APPROVED",    icon: CheckCircle },
  rejected:          { color: "text-red-400 border-red-500/40",              label: "REJECTED",    icon: XCircle },
  awaiting_approval: { color: "text-orange-400 border-orange-500/40",        label: "APPROVAL",    icon: AlertTriangle },
  failed:            { color: "text-red-400 border-red-500/40",              label: "FAILED",      icon: XCircle },
};

const RISK_COLORS: Record<string, string> = {
  critical: "text-red-400", high: "text-orange-400", medium: "text-yellow-400", low: "text-emerald-400",
};

function timeAgo(date: string | null) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function AutonomousSOC() {
  const { toast } = useToast();
  const [actions, setActions]     = useState<AutonomousAction[]>([]);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<AutonomousAction | null>(null);
  const [acting, setActing]       = useState<number | null>(null);
  const [filter, setFilter]       = useState("all");
  const [tab, setTab]             = useState<"actions" | "briefings">("actions");
  const [triageIncident, setTriageIncident] = useState("");
  const [triaging, setTriaging]   = useState(false);
  const [triageOutput, setTriageOutput]     = useState("");
  const [generating, setGenerating] = useState(false);
  const [briefingOutput, setBriefingOutput] = useState("");
  const briefinRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, bRes] = await Promise.all([
        fetch(`${BASE}/api/autonomous/actions`, { credentials: "include" }),
        fetch(`${BASE}/api/autonomous/briefings`, { credentials: "include" }),
      ]);
      setActions(await aRes.json());
      setBriefings(await bRes.json());
    } catch { toast({ title: "Failed to load", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: number) => {
    setActing(id);
    try {
      const res = await fetch(`${BASE}/api/autonomous/actions/${id}/approve`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approvedBy: "SOC Analyst" }) });
      const updated = await res.json();
      setActions(as => as.map(a => a.id === id ? { ...a, ...updated } : a));
      if (selected?.id === id) setSelected(s => s ? { ...s, ...updated } : s);
      toast({ title: "Action approved" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setActing(null); }
  };

  const reject = async (id: number) => {
    setActing(id);
    try {
      const res = await fetch(`${BASE}/api/autonomous/actions/${id}/reject`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const updated = await res.json();
      setActions(as => as.map(a => a.id === id ? { ...a, ...updated } : a));
      if (selected?.id === id) setSelected(s => s ? { ...s, ...updated } : s);
      toast({ title: "Action rejected" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setActing(null); }
  };

  const runTriage = async () => {
    if (!triageIncident) return;
    setTriaging(true); setTriageOutput("");
    try {
      const res = await fetch(`${BASE}/api/autonomous/triage/${triageIncident}`, { method: "POST", credentials: "include" });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.type === "token") setTriageOutput(o => o + evt.text);
            if (evt.type === "complete") { await load(); }
          } catch { /* */ }
        }
      }
    } catch { toast({ title: "Triage failed", variant: "destructive" }); }
    finally { setTriaging(false); }
  };

  const generateBriefing = async () => {
    setGenerating(true); setBriefingOutput("");
    try {
      const res = await fetch(`${BASE}/api/autonomous/briefings/generate`, { method: "POST", credentials: "include" });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.type === "token") { setBriefingOutput(o => o + evt.text); briefinRef.current?.scrollIntoView({ behavior: "smooth" }); }
            if (evt.type === "complete") { await load(); }
          } catch { /* */ }
        }
      }
    } catch { toast({ title: "Generation failed", variant: "destructive" }); }
    finally { setGenerating(false); }
  };

  const filteredActions = actions.filter(a => {
    if (filter === "approval") return a.status === "awaiting_approval";
    if (filter === "complete") return ["complete", "approved", "rejected"].includes(a.status);
    if (filter === "auto") return !a.requiresApproval && a.status === "complete";
    return true;
  });

  const approvalCount = actions.filter(a => a.status === "awaiting_approval").length;
  const completeCount = actions.filter(a => ["complete", "approved"].includes(a.status)).length;
  const autoRate = actions.length > 0 ? Math.round((actions.filter(a => !a.requiresApproval).length / actions.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold tracking-wider">AUTONOMOUS SOC</h1>
              {approvalCount > 0 && (
                <div className="flex items-center gap-1 border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 ml-1">
                  <AlertTriangle className="h-3 w-3 text-orange-400" />
                  <span className="text-xs font-mono text-orange-400">{approvalCount} PENDING</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-1">AI-driven autonomous triage, response, and executive briefings</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="font-mono text-xs">
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />REFRESH
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: "TOTAL ACTIONS", value: actions.length, icon: Zap },
            { label: "EXECUTED", value: completeCount, icon: CheckCircle, accent: true },
            { label: "APPROVAL QUEUE", value: approvalCount, icon: AlertTriangle, warn: approvalCount > 0 },
            { label: "AUTO-RESOLVE RATE", value: `${autoRate}%`, icon: TrendingUp },
          ].map(({ label, value, icon: Icon, accent, warn }) => (
            <div key={label} className={cn("border p-3 text-center", warn ? "border-orange-500/30 bg-orange-500/5" : accent ? "border-primary/30 bg-primary/5" : "border-border bg-card")}>
              <Icon className={cn("h-4 w-4 mx-auto mb-1", warn ? "text-orange-400" : accent ? "text-primary" : "text-muted-foreground")} />
              <div className={cn("text-lg font-bold font-mono", warn ? "text-orange-400" : accent ? "text-primary" : "")}>{value}</div>
              <div className="text-xs font-mono text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {(["actions", "briefings"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-3 py-1 text-xs font-mono border transition-colors",
                tab === t ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>
              {t === "actions" ? "AUTONOMOUS ACTIONS" : "AI BRIEFINGS"}
            </button>
          ))}
        </div>
      </div>

      {tab === "actions" ? (
        <div className="flex flex-1 min-h-0">
          {/* Action Feed */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Triage Panel */}
            <div className="border-b border-border p-3 bg-muted/10 shrink-0">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono text-primary">AI AUTONOMOUS TRIAGE</span>
                <div className="flex-1" />
                <Select value={triageIncident} onValueChange={setTriageIncident}>
                  <SelectTrigger className="w-48 h-7 font-mono text-xs"><SelectValue placeholder="Select incident..." /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map(i => <SelectItem key={i} value={String(i)} className="font-mono text-xs">INC-{i}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-7 font-mono text-xs bg-primary text-primary-foreground"
                  onClick={runTriage} disabled={triaging || !triageIncident}>
                  {triaging ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}TRIAGE
                </Button>
              </div>
              {triageOutput && (
                <div className="mt-2 bg-muted/30 border border-border p-2 text-xs font-mono text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {triageOutput}
                </div>
              )}
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/5 shrink-0">
              {[
                { key: "all", label: `ALL (${actions.length})` },
                { key: "approval", label: `APPROVAL (${approvalCount})` },
                { key: "complete", label: `COMPLETE (${completeCount})` },
                { key: "auto", label: "AUTO-EXECUTED" },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={cn("px-2 py-0.5 text-xs font-mono border transition-colors",
                    filter === f.key ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center h-20"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : filteredActions.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">No actions match this filter.</div>
              ) : filteredActions.map(action => {
                const TypeIcon = TYPE_ICONS[action.type] ?? Zap;
                const statusCfg = STATUS_CONFIG[action.status] ?? STATUS_CONFIG.pending;
                const StatusIcon = statusCfg.icon;
                const isActing = acting === action.id;
                return (
                  <div key={action.id}
                    onClick={() => setSelected(s => s?.id === action.id ? null : action)}
                    className={cn("border bg-card p-3 cursor-pointer hover:border-primary/40 transition-all",
                      action.status === "awaiting_approval" ? "border-orange-500/30 bg-orange-500/5" : selected?.id === action.id ? "border-primary/50" : "border-border")}>
                    <div className="flex items-start gap-3">
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center border mt-0.5", TYPE_COLORS[action.type] ?? "border-border")}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium">{action.title}</span>
                          <Badge variant="outline" className={cn("text-xs shrink-0", statusCfg.color)}>
                            <StatusIcon className={cn("h-2.5 w-2.5 mr-1", action.status === "executing" ? "animate-spin" : "")} />{statusCfg.label}
                          </Badge>
                          {action.requiresApproval && <Badge variant="outline" className="text-xs text-orange-400 border-orange-500/40 shrink-0">HUMAN REQUIRED</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mb-2 flex-wrap">
                          <span className={RISK_COLORS[action.riskLevel]}>{action.riskLevel.toUpperCase()} RISK</span>
                          <span>CONFIDENCE: {Math.round(action.confidence * 100)}%</span>
                          {action.incidentTitle && <span className="truncate">INC-{action.incidentId}: {action.incidentTitle}</span>}
                          <span>{timeAgo(action.createdAt)}</span>
                        </div>

                        {selected?.id === action.id && (
                          <>
                            <div className="text-xs text-muted-foreground mb-2 border-l-2 border-yellow-500/40 pl-2">{action.reasoning}</div>
                            {action.result && (
                              <div className="bg-muted/30 border border-border p-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap mb-2 max-h-40 overflow-y-auto">{action.result}</div>
                            )}
                            {action.approvedBy && <div className="text-xs font-mono text-emerald-400 mb-2">✓ Approved by {action.approvedBy}</div>}
                          </>
                        )}

                        {action.status === "awaiting_approval" && (
                          <div className="flex gap-2 mt-1" onClick={e => e.stopPropagation()}>
                            <Button size="sm" className="h-6 text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                              onClick={() => approve(action.id)} disabled={isActing}>
                              {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3 mr-1" />}APPROVE
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-xs font-mono text-destructive border-destructive/40 hover:bg-destructive/10"
                              onClick={() => reject(action.id)} disabled={isActing}>
                              <ThumbsDown className="h-3 w-3 mr-1" />REJECT
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Briefings Tab */
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            {/* Generate Panel */}
            <div className="border-b border-border p-4 bg-muted/10 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-xs font-mono text-primary">AI EXECUTIVE BRIEFING GENERATOR</span>
                </div>
                <Button size="sm" className="h-7 font-mono text-xs bg-primary text-primary-foreground"
                  onClick={generateBriefing} disabled={generating}>
                  {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}GENERATE BRIEFING
                </Button>
              </div>
              {briefingOutput && (
                <div className="bg-muted/30 border border-border p-3 text-xs font-mono text-muted-foreground max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {briefingOutput}
                  <div ref={briefinRef} />
                </div>
              )}
            </div>

            {/* Briefing History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-20"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : briefings.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No briefings yet. Generate your first executive briefing above.
                </div>
              ) : briefings.map(briefing => (
                <div key={briefing.id} className="border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium text-sm">{briefing.title}</div>
                      <div className="text-xs font-mono text-muted-foreground mt-0.5">{briefing.period} · Generated {timeAgo(briefing.generatedAt)}</div>
                    </div>
                    <Badge variant="outline" className="text-xs text-primary border-primary/40 shrink-0">BRIEFING</Badge>
                  </div>

                  {Object.keys(briefing.metrics).length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {Object.entries(briefing.metrics).map(([k, v]) => (
                        <div key={k} className="bg-muted/30 border border-border p-2 text-center">
                          <div className="text-sm font-bold font-mono">{v}</div>
                          <div className="text-xs font-mono text-muted-foreground">{k.replace(/([A-Z])/g, " $1").toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-mono text-muted-foreground mb-1">KEY FINDINGS</div>
                      {briefing.keyFindings.map((f, i) => (
                        <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 mb-1">
                          <div className="h-1 w-1 rounded-full bg-primary shrink-0 mt-1.5" />{f}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-xs font-mono text-muted-foreground mb-1">RECOMMENDATIONS</div>
                      {briefing.recommendations.map((r, i) => (
                        <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 mb-1">
                          <div className="h-1 w-1 rounded-full bg-yellow-400 shrink-0 mt-1.5" />{r}
                        </div>
                      ))}
                    </div>
                  </div>

                  {briefing.content && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-6">{briefing.content}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
