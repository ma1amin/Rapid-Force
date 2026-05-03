import { useState, useEffect, useCallback } from "react";
import { Bot, Cpu, Search, Shield, Zap, Crown, CheckCircle, Clock, AlertTriangle, XCircle, Play, ThumbsUp, ThumbsDown, RefreshCcw, Loader2, ChevronDown, ChevronRight, Send, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Agent {
  id: number; name: string; role: string; description: string; specialization: string;
  status: string; tasksCompleted: number; successRate: number; model: string;
  capabilities: string[]; currentTask: string | null; avatarColor: string;
}

interface AgentTask {
  id: number; agentId: number; incidentId: number | null; type: string; title: string;
  description: string; status: string; priority: string; result: string | null;
  reasoning: string | null; evidence: string[]; humanRequired: boolean;
  approvedBy: string | null; rejectionReason: string | null;
  startedAt: string | null; completedAt: string | null; createdAt: string;
}

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  soc_analyst: Shield, threat_hunter: Search, malware_analyst: Cpu,
  detection_engineer: Zap, incident_commander: Crown,
};
const ROLE_LABELS: Record<string, string> = {
  soc_analyst: "SOC Analyst", threat_hunter: "Threat Hunter", malware_analyst: "Malware Analyst",
  detection_engineer: "Detection Engineer", incident_commander: "Incident Commander",
};
const STATUS_CONFIG: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  online:       { color: "text-emerald-400", icon: CheckCircle },
  investigating: { color: "text-yellow-400", icon: Search },
  idle:         { color: "text-muted-foreground", icon: Clock },
  offline:      { color: "text-red-400", icon: XCircle },
};
const TASK_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending:           { color: "text-muted-foreground border-border", label: "PENDING" },
  in_progress:       { color: "text-yellow-400 border-yellow-500/40", label: "IN PROGRESS" },
  awaiting_approval: { color: "text-orange-400 border-orange-500/40", label: "AWAITING APPROVAL" },
  approved:          { color: "text-emerald-400 border-emerald-500/40", label: "APPROVED" },
  rejected:          { color: "text-red-400 border-red-500/40", label: "REJECTED" },
  complete:          { color: "text-primary border-primary/40", label: "COMPLETE" },
  failed:            { color: "text-red-400 border-red-500/40", label: "FAILED" },
};
const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-400 border-red-500/40 bg-red-500/10",
  high:     "text-orange-400 border-orange-500/40 bg-orange-500/10",
  medium:   "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
  low:      "text-muted-foreground border-border bg-muted/30",
};

function timeAgo(date: string | null) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function AIAgentOrchestration() {
  const { toast } = useToast();
  const [agents, setAgents]       = useState<Agent[]>([]);
  const [tasks, setTasks]         = useState<AgentTask[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedTask, setSelectedTask]   = useState<AgentTask | null>(null);
  const [dispatchOpen, setDispatchOpen]   = useState(false);
  const [dispatchAgent, setDispatchAgent] = useState<Agent | null>(null);
  const [dispatching, setDispatching]     = useState(false);
  const [acting, setActing]       = useState<number | null>(null);
  const [taskFilter, setTaskFilter] = useState("all");
  const [form, setForm] = useState({ type: "triage", title: "", description: "", incidentId: "" });
  const [conversation, setConversation] = useState<{ role: string; content: string }[]>([]);
  const [convLoading, setConvLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, tRes] = await Promise.all([
        fetch(`${BASE}/api/ai-agents`, { credentials: "include" }),
        fetch(`${BASE}/api/agent-tasks`, { credentials: "include" }),
      ]);
      const [aData, tData] = await Promise.all([aRes.json(), tRes.json()]);
      setAgents(Array.isArray(aData) ? aData : []);
      setTasks(Array.isArray(tData) ? tData : []);
    } catch { toast({ title: "Failed to load", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (taskId: number) => {
    setActing(taskId);
    try {
      const res = await fetch(`${BASE}/api/agent-tasks/${taskId}/approve`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approvedBy: "SOC Analyst" }) });
      const updated = await res.json();
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, ...updated } : t));
      if (selectedTask?.id === taskId) setSelectedTask(s => s ? { ...s, ...updated } : s);
      toast({ title: "Task approved" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setActing(null); }
  };

  const reject = async (taskId: number) => {
    setActing(taskId);
    try {
      const res = await fetch(`${BASE}/api/agent-tasks/${taskId}/reject`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Analyst override" }) });
      const updated = await res.json();
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, ...updated } : t));
      if (selectedTask?.id === taskId) setSelectedTask(s => s ? { ...s, ...updated } : s);
      toast({ title: "Task rejected" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setActing(null); }
  };

  const dispatch = async () => {
    if (!dispatchAgent || !form.title || !form.description) return;
    setDispatching(true);
    try {
      const res = await fetch(`${BASE}/api/ai-agents/${dispatchAgent.id}/dispatch`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: form.type, title: form.title, description: form.description, incidentId: form.incidentId ? Number(form.incidentId) : null }),
      });
      const { agent: _agent, ...newTask } = await res.json();
      setTasks(ts => [{ ...newTask, evidence: newTask.evidence ?? [] }, ...ts]);
      setAgents(as => as.map(a => a.id === dispatchAgent.id ? { ...a, status: "investigating", currentTask: form.title } : a));
      setDispatchOpen(false);
      setForm({ type: "triage", title: "", description: "", incidentId: "" });
      toast({ title: `Task dispatched to ${dispatchAgent.name}`, description: "Agent is analyzing…" });
      setTimeout(() => load(), 8000);
    } catch { toast({ title: "Dispatch failed", variant: "destructive" }); }
    finally { setDispatching(false); }
  };

  const viewConversation = async (task: AgentTask) => {
    setSelectedTask(task);
    setConvLoading(true);
    try {
      const res = await fetch(`${BASE}/api/agent-tasks/${task.id}/conversation`, { credentials: "include" });
      setConversation(await res.json());
    } catch { setConversation([]); }
    finally { setConvLoading(false); }
  };

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === "approval") return t.status === "awaiting_approval";
    if (taskFilter === "active") return ["pending", "in_progress"].includes(t.status);
    if (taskFilter === "complete") return ["complete", "approved", "rejected"].includes(t.status);
    return true;
  });

  const approvalCount = tasks.filter(t => t.status === "awaiting_approval").length;
  const activeCount   = tasks.filter(t => ["pending", "in_progress"].includes(t.status)).length;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold tracking-wider">AI AGENT ORCHESTRATION</h1>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-1">Multi-agent SOC workflow with human-in-the-loop controls</p>
          </div>
          <div className="flex items-center gap-4">
            {approvalCount > 0 && (
              <div className="flex items-center gap-1.5 border border-orange-500/40 bg-orange-500/10 px-3 py-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-xs font-mono text-orange-400">{approvalCount} AWAITING APPROVAL</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={load} className="font-mono text-xs">
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />REFRESH
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Agent Roster */}
        <div className="w-72 border-r border-border flex flex-col shrink-0">
          <div className="px-4 py-2 border-b border-border bg-muted/20">
            <span className="text-xs font-mono text-muted-foreground tracking-widest">AGENT ROSTER</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-20"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : agents.map(agent => {
              const RoleIcon = ROLE_ICONS[agent.role] ?? Bot;
              const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle;
              const StatusIcon = statusCfg.icon;
              return (
                <div key={agent.id}
                  onClick={() => setSelectedAgent(a => a?.id === agent.id ? null : agent)}
                  className={cn("p-4 border-b border-border cursor-pointer hover:bg-muted/20 transition-colors",
                    selectedAgent?.id === agent.id ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent")}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center border" style={{ borderColor: agent.avatarColor + "40", backgroundColor: agent.avatarColor + "15" }}>
                        <RoleIcon className="h-4 w-4" style={{ color: agent.avatarColor }} />
                      </div>
                      <div className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-background",
                        agent.status === "online" ? "bg-emerald-400" : agent.status === "investigating" ? "bg-yellow-400 animate-pulse" : agent.status === "idle" ? "bg-muted-foreground" : "bg-red-400")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm font-mono">{agent.name}</div>
                      <div className="text-xs text-muted-foreground">{ROLE_LABELS[agent.role]}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-1">
                    <span className={statusCfg.color}><StatusIcon className="h-3 w-3 inline mr-1" />{agent.status.toUpperCase()}</span>
                    <span>{agent.successRate.toFixed(1)}% SUCCESS</span>
                  </div>
                  {agent.currentTask && (
                    <div className="text-xs text-yellow-400 font-mono truncate mt-1 border-l border-yellow-500/40 pl-2">{agent.currentTask}</div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-mono text-muted-foreground">{agent.tasksCompleted} tasks</span>
                    <Button size="sm" variant="outline" className="h-6 text-xs font-mono px-2 py-0"
                      onClick={e => { e.stopPropagation(); setDispatchAgent(agent); setDispatchOpen(true); }}>
                      <Send className="h-3 w-3 mr-1" />DISPATCH
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Agent Detail */}
          {selectedAgent && (
            <div className="border-b border-border p-4 bg-muted/10 shrink-0">
              <div className="flex items-start gap-4">
                <div>
                  <div className="text-xs font-mono text-muted-foreground mb-2">SPECIALIZATION</div>
                  <p className="text-xs text-muted-foreground">{selectedAgent.specialization}</p>
                </div>
                <div className="shrink-0">
                  <div className="text-xs font-mono text-muted-foreground mb-2">CAPABILITIES</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedAgent.capabilities.slice(0, 4).map(c => (
                      <span key={c} className="text-xs font-mono border border-border px-1.5 py-0.5 text-muted-foreground">{c}</span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="text-xs font-mono text-muted-foreground mb-2">MODEL</div>
                  <span className="text-xs font-mono text-primary border border-primary/40 px-2 py-0.5">{selectedAgent.model}</span>
                </div>
              </div>
            </div>
          )}

          {/* Task Queue */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/10 shrink-0 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">TASK QUEUE</span>
            {[
              { key: "all", label: `ALL (${tasks.length})` },
              { key: "approval", label: `APPROVAL (${approvalCount})` },
              { key: "active", label: `ACTIVE (${activeCount})` },
              { key: "complete", label: "COMPLETE" },
            ].map(f => (
              <button key={f.key} onClick={() => setTaskFilter(f.key)}
                className={cn("px-2 py-0.5 text-xs font-mono border transition-colors",
                  taskFilter === f.key ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center h-20"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">No tasks match this filter.</div>
              ) : filteredTasks.map(task => {
                const agent = agents.find(a => a.id === task.agentId);
                const RoleIcon = agent ? (ROLE_ICONS[agent.role] ?? Bot) : Bot;
                const statusCfg = TASK_STATUS_CONFIG[task.status] ?? TASK_STATUS_CONFIG.pending;
                const isActing = acting === task.id;
                return (
                  <div key={task.id}
                    className={cn("border bg-card p-3 cursor-pointer hover:border-primary/40 transition-all",
                      task.status === "awaiting_approval" ? "border-orange-500/40 bg-orange-500/5" : selectedTask?.id === task.id ? "border-primary/50" : "border-border")}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted/30 mt-0.5">
                        <RoleIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium truncate">{task.title}</span>
                          <Badge variant="outline" className={cn("text-xs shrink-0", statusCfg.color)}>{statusCfg.label}</Badge>
                          <Badge variant="outline" className={cn("text-xs shrink-0", PRIORITY_COLORS[task.priority])}>{task.priority.toUpperCase()}</Badge>
                          {task.humanRequired && <Badge variant="outline" className="text-xs text-orange-400 border-orange-500/40 shrink-0">HUMAN REVIEW</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mb-2">
                          <span>{agent?.name ?? "Unassigned"}</span>
                          <span>·</span>
                          <span>{timeAgo(task.createdAt)}</span>
                          {task.incidentId && <span>· INC-{task.incidentId}</span>}
                        </div>

                        {task.result && (
                          <div className="bg-muted/30 border border-border p-2 text-xs font-mono text-muted-foreground mb-2 line-clamp-3 whitespace-pre-wrap">{task.result}</div>
                        )}

                        {task.evidence.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {task.evidence.slice(0, 3).map((e, i) => (
                              <span key={i} className="text-xs font-mono border border-border px-1.5 py-0.5 text-muted-foreground">{e}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {task.status === "awaiting_approval" && (
                            <>
                              <Button size="sm" className="h-6 text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                                onClick={() => approve(task.id)} disabled={isActing}>
                                {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3 mr-1" />}APPROVE
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs font-mono text-destructive border-destructive/40 hover:bg-destructive/10"
                                onClick={() => reject(task.id)} disabled={isActing}>
                                <ThumbsDown className="h-3 w-3 mr-1" />REJECT
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" className="h-6 text-xs font-mono"
                            onClick={() => viewConversation(task)}>
                            <Eye className="h-3 w-3 mr-1" />VIEW LOG
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Conversation Panel */}
            {selectedTask && (
              <div className="w-80 border-l border-border flex flex-col shrink-0">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/10">
                  <span className="text-xs font-mono text-muted-foreground">AGENT REASONING LOG</span>
                  <button onClick={() => setSelectedTask(null)} className="text-muted-foreground hover:text-foreground">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  <div className="text-xs font-mono text-muted-foreground border border-border bg-muted/20 p-2">
                    <span className="text-primary">TASK:</span> {selectedTask.title}
                  </div>
                  {selectedTask.reasoning && (
                    <div className="text-xs text-muted-foreground border-l-2 border-yellow-500/40 pl-2">
                      <div className="font-mono text-yellow-400 mb-1">REASONING</div>
                      {selectedTask.reasoning}
                    </div>
                  )}
                  {convLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs"><Loader2 className="h-3 w-3 animate-spin" />Loading conversation...</div>
                  ) : conversation.length > 0 ? conversation.map((msg, i) => (
                    <div key={i} className={cn("text-xs p-2 border", msg.role === "assistant" ? "border-primary/20 bg-primary/5" : "border-border bg-muted/20")}>
                      <div className={cn("font-mono mb-1", msg.role === "assistant" ? "text-primary" : "text-muted-foreground")}>
                        {msg.role === "assistant" ? "AGENT" : "TASK INPUT"}
                      </div>
                      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    </div>
                  )) : (
                    <div className="text-xs text-muted-foreground">No conversation log yet. Dispatch a task to see AI reasoning.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dispatch Dialog */}
      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent className="bg-background border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">DISPATCH TASK — {dispatchAgent?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1">TASK TYPE</label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="font-mono text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["triage","investigate","hunt","analyze","detection","escalate","notify"].map(t => (
                    <SelectItem key={t} value={t} className="font-mono text-xs">{t.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1">TASK TITLE</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Triage: Suspicious PowerShell Activity" className="font-mono text-xs h-8" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1">DESCRIPTION / CONTEXT</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Provide context, logs, IOCs, or investigation scope..." className="font-mono text-xs min-h-24 resize-none" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1">INCIDENT ID (optional)</label>
              <Input value={form.incidentId} onChange={e => setForm(f => ({ ...f, incidentId: e.target.value }))}
                placeholder="e.g. 1" className="font-mono text-xs h-8" type="number" />
            </div>
            <Button onClick={dispatch} disabled={dispatching || !form.title || !form.description}
              className="w-full font-mono text-xs bg-primary text-primary-foreground">
              {dispatching ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" />DISPATCHING...</> : <><Play className="h-3 w-3 mr-2" />DISPATCH TO {dispatchAgent?.name}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
