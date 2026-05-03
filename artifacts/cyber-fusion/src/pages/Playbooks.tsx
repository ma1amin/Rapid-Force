import { useState, useEffect, useCallback } from "react";
import { BookOpen, Play, Pause, Clock, Plus, Search, ChevronRight, Zap, Bot, Eye, X, Lightbulb, ChevronDown, Square, FilterX, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type PlaybookStatus   = "active" | "paused" | "draft";
type PlaybookSeverity = "critical" | "high" | "medium" | "info";

interface PlaybookStep { id: number; action: string; type: string; automated: boolean }

interface Playbook {
  id: number;
  name: string;
  description: string;
  trigger: string;
  category: string;
  steps: PlaybookStep[];
  completedRuns: number;
  avgRuntime: string;
  status: PlaybookStatus;
  severity: PlaybookSeverity;
  automationRate: number;
  updatedAt: string;
  createdAt: string;
}

function deriveLastRun(pb: Playbook): string {
  if (pb.completedRuns === 0) return "Never";
  const diff = Date.now() - new Date(pb.updatedAt).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  return `${Math.floor(diff / 604800000)} weeks ago`;
}

const TEMPLATE_SUGGESTIONS = [
  { name: "Credential Breach Notification", description: "Cross-reference HIBP and dark web feeds, force password reset, invalidate sessions, and notify user.", trigger: "Threat Intel: Credential Exposure Detected", category: "Identity", severity: "high" as PlaybookSeverity, steps: 7, automationRate: 93 },
  { name: "Malware Quarantine & Analysis", description: "Sandbox execution, hash lookup, EDR quarantine, and automatic IOC extraction.", trigger: "Detection: Malware / Suspicious Binary", category: "Incident Response", severity: "high" as PlaybookSeverity, steps: 10, automationRate: 85 },
  { name: "Critical Asset Access Anomaly", description: "Respond to out-of-hours or geo-impossible access to crown-jewel assets and databases.", trigger: "UEBA Alert: Critical Asset Access", category: "Identity", severity: "critical" as PlaybookSeverity, steps: 8, automationRate: 78 },
  { name: "SSRF / Server-Side Request Forgery", description: "Detect and isolate SSRF exploitation attempts targeting internal metadata endpoints.", trigger: "WAF Alert: SSRF Pattern Detected", category: "Application Security", severity: "high" as PlaybookSeverity, steps: 6, automationRate: 82 },
  { name: "Insider Threat — Data Hoarding", description: "Detect unusual bulk download of sensitive files and cross-reference with UEBA risk score.", trigger: "DLP Alert: Bulk File Access Anomaly", category: "Data Loss", severity: "high" as PlaybookSeverity, steps: 9, automationRate: 70 },
  { name: "Serverless / Lambda Abuse", description: "Detect anomalous Lambda invocations, exfil via function output, and auto-disable offending functions.", trigger: "CloudTrail: Anomalous Lambda Execution", category: "Cloud Security", severity: "medium" as PlaybookSeverity, steps: 7, automationRate: 84 },
  { name: "SLA Breach Vulnerability Remediation", description: "Track overdue critical/high CVEs, auto-escalate to asset owner and create Jira ticket.", trigger: "Vulnerability: SLA Breach Threshold Reached", category: "Vulnerability Mgmt", severity: "medium" as PlaybookSeverity, steps: 5, automationRate: 90 },
  { name: "Third-Party Supply Chain Alert", description: "Correlate vendor breach intelligence with your asset inventory and trigger quarantine for affected components.", trigger: "Threat Intel: Vendor / Supply Chain Breach", category: "Threat Intel", severity: "critical" as PlaybookSeverity, steps: 11, automationRate: 65 },
];

const CATEGORIES = ["All", "Incident Response", "Threat Intel", "Identity", "Data Loss", "Vulnerability Mgmt", "Cloud Security", "Application Security"];
const STATUSES   = ["All", "active", "paused", "draft"];

const severityColors: Record<string, string> = {
  critical: "text-red-400 border-red-500/40 bg-red-500/10",
  high:     "text-orange-400 border-orange-500/40 bg-orange-500/10",
  medium:   "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
  info:     "text-primary border-primary/40 bg-primary/10",
};
const statusColors: Record<string, string> = {
  active: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  paused: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
  draft:  "text-muted-foreground border-border bg-muted/30",
};
const statusIcons: Record<string, React.ReactNode> = {
  active: <Play className="w-3 h-3" />,
  paused: <Pause className="w-3 h-3" />,
  draft:  <Clock className="w-3 h-3" />,
};

const EMPTY_FORM = { name: "", description: "", trigger: "", category: "Incident Response", severity: "high" as PlaybookSeverity, steps: "6", automationRate: "80" };

export default function Playbooks() {
  const { toast } = useToast();
  const [playbooks, setPlaybooks]     = useState<Playbook[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [category, setCategory]       = useState("All");
  const [status, setStatus]           = useState("All");
  const [selectedId, setSelectedId]   = useState<number | null>(null);
  const [runningId, setRunningId]     = useState<number | null>(null);
  const [modalOpen, setModalOpen]     = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formError, setFormError]     = useState("");
  const [creating, setCreating]       = useState(false);

  const selected = playbooks.find(p => p.id === selectedId) ?? null;

  const fetchPlaybooks = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/playbooks`, { credentials: "include" });
      if (r.ok) {
        const data: Playbook[] = await r.json();
        setPlaybooks(data);
        if (data.length > 0 && selectedId === null) setSelectedId(data[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlaybooks(); }, [fetchPlaybooks]);

  const filtered = playbooks.filter(pb => {
    if (category !== "All" && pb.category !== category) return false;
    if (status !== "All" && pb.status !== status) return false;
    if (search && !pb.name.toLowerCase().includes(search.toLowerCase()) && !pb.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hasActiveFilters = category !== "All" || status !== "All" || search !== "";
  const totalRuns     = playbooks.reduce((s, p) => s + p.completedRuns, 0);
  const activeCount   = playbooks.filter(p => p.status === "active").length;
  const avgAutomation = playbooks.length > 0 ? Math.round(playbooks.reduce((s, p) => s + p.automationRate, 0) / playbooks.length) : 0;

  function clearAllFilters() { setCategory("All"); setStatus("All"); setSearch(""); }
  function openBlank() { setForm(EMPTY_FORM); setFormError(""); setShowSuggestions(false); setModalOpen(true); }

  function prefillFromTemplate(t: typeof TEMPLATE_SUGGESTIONS[0]) {
    setForm({ name: t.name, description: t.description, trigger: t.trigger, category: t.category, severity: t.severity, steps: String(t.steps), automationRate: String(t.automationRate) });
    setFormError("");
    setShowSuggestions(false);
    setModalOpen(true);
  }

  async function handleCreate() {
    if (!form.name.trim())    { setFormError("Playbook name is required."); return; }
    if (!form.trigger.trim()) { setFormError("Trigger condition is required."); return; }
    setCreating(true);
    try {
      const body = {
        name:           form.name.trim(),
        description:    form.description.trim(),
        trigger:        form.trigger.trim(),
        category:       form.category,
        severity:       form.severity,
        automationRate: Math.min(100, Math.max(0, parseInt(form.automationRate) || 70)),
        steps: Array.from({ length: Math.max(1, parseInt(form.steps) || 5) }, (_, i) => ({
          action: `Step ${i + 1}`, type: i % 2 === 0 ? "automated" : "manual", automated: i % 2 === 0,
        })),
      };
      const r = await fetch(`${BASE}/api/playbooks`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const created: Playbook = await r.json();
        setPlaybooks(prev => [created, ...prev]);
        setModalOpen(false);
        setSelectedId(created.id);
        toast({ title: "Playbook created", description: `"${created.name}" saved as draft. Activate it to start receiving triggers.` });
      } else {
        const err = await r.json().catch(() => ({}));
        setFormError((err as any).error ?? "Failed to create playbook.");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRun(pb: Playbook) {
    if (runningId === pb.id) {
      setRunningId(null);
      toast({ title: `Playbook stopped: ${pb.name}`, description: "Execution aborted." });
      return;
    }
    setRunningId(pb.id);
    toast({ title: `Playbook triggered: ${pb.name}`, description: "Execution started. Monitor in the incident timeline." });
    try {
      const r = await fetch(`${BASE}/api/playbooks/${pb.id}/execute`, { method: "POST", credentials: "include" });
      if (r.ok) {
        const updated: Playbook = await r.json();
        setPlaybooks(prev => prev.map(p => p.id === pb.id ? updated : p));
        toast({ title: `Playbook complete: ${pb.name}`, description: "Execution finished successfully." });
      }
    } catch {
      toast({ title: "Execution error", variant: "destructive" });
    } finally {
      setRunningId(null);
    }
  }

  async function handleSetStatus(pb: Playbook, newStatus: PlaybookStatus) {
    try {
      const r = await fetch(`${BASE}/api/playbooks/${pb.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (r.ok) {
        const updated: Playbook = await r.json();
        setPlaybooks(prev => prev.map(p => p.id === pb.id ? updated : p));
        const msg = newStatus === "active" ? `"${pb.name}" is now live and listening for triggers.` : `"${pb.name}" has been paused.`;
        toast({ title: newStatus === "active" ? "Playbook activated" : "Playbook paused", description: msg });
      }
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-primary/70 tracking-widest mb-1">RAPID FORCE // AI SOAR</div>
          <h1 className="text-2xl font-bold tracking-wider">AI PLAYBOOKS</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">Automated response workflows · SOAR engine</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchPlaybooks} variant="ghost" size="sm"
            className="border border-border text-muted-foreground hover:text-primary font-mono text-xs gap-1.5 h-8">
            <RefreshCcw className="w-3.5 h-3.5" /> REFRESH
          </Button>
          <Button onClick={() => setShowSuggestions(s => !s)}
            variant="ghost" className="border border-border text-muted-foreground hover:text-primary hover:border-primary/40 font-mono text-xs gap-2 h-8">
            <Lightbulb className="w-3.5 h-3.5" /> SUGGESTIONS
            <ChevronDown className={cn("w-3 h-3 transition-transform", showSuggestions && "rotate-180")} />
          </Button>
          <Button onClick={openBlank}
            className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-mono text-xs gap-2">
            <Plus className="w-4 h-4" /> NEW PLAYBOOK
          </Button>
        </div>
      </div>

      {/* Suggestions panel */}
      {showSuggestions && (
        <div className="bg-card border border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-primary tracking-wider">RECOMMENDED PLAYBOOKS FOR YOUR THREAT LANDSCAPE</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATE_SUGGESTIONS.map(t => (
              <button key={t.name} onClick={() => prefillFromTemplate(t)}
                className="text-left p-3 border border-border hover:border-primary/40 hover:bg-muted/40 transition-all group">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold font-mono group-hover:text-primary transition-colors">{t.name}</span>
                  <Badge className={cn("text-[9px] font-mono border px-1.5 py-0 flex-shrink-0", severityColors[t.severity])}>{t.severity.toUpperCase()}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono leading-relaxed mb-2">{t.description}</p>
                <div className="flex gap-3 text-[10px] font-mono text-muted-foreground">
                  <span>{t.steps} steps</span>
                  <span>{t.automationRate}% auto</span>
                  <span>{t.category}</span>
                </div>
                <div className="mt-2 text-[10px] font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to use as template →
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "TOTAL PLAYBOOKS",  value: loading ? "—" : playbooks.length,           icon: BookOpen, color: "text-primary"    },
          { label: "ACTIVE",           value: loading ? "—" : activeCount,                icon: Play,     color: "text-emerald-400" },
          { label: "TOTAL EXECUTIONS", value: loading ? "—" : totalRuns.toLocaleString(), icon: Zap,      color: "text-amber-400"   },
          { label: "AVG AUTOMATION",   value: loading ? "—" : `${avgAutomation}%`,        icon: Bot,      color: "text-violet-400"  },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-mono tracking-wider">{stat.label}</span>
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            </div>
            <div className={cn("text-2xl font-bold font-mono", stat.color)}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search playbooks..."
            className="pl-9 bg-card border-border font-mono text-xs h-8" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={cn("px-2.5 py-1 text-xs font-mono border transition-all",
                category === c ? "bg-primary/20 border-primary/50 text-primary" : "bg-card border-border text-muted-foreground hover:border-border/80"
              )}>{c}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={cn("px-2.5 py-1 text-xs font-mono border transition-all capitalize",
                status === s ? "bg-primary/20 border-primary/50 text-primary" : "bg-card border-border text-muted-foreground hover:border-border/80"
              )}>{s}</button>
          ))}
        </div>
        {hasActiveFilters && (
          <button onClick={clearAllFilters}
            className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-destructive transition-colors">
            <FilterX className="w-3.5 h-3.5" />CLEAR
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground font-mono text-xs">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading playbooks...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Playbook list */}
          <div className="col-span-2 space-y-3">
            {filtered.map(pb => {
              const isRunning = runningId === pb.id;
              const stepCount = Array.isArray(pb.steps) ? pb.steps.length : 0;
              return (
                <div key={pb.id} onClick={() => setSelectedId(pb.id)}
                  className={cn("bg-card border p-4 cursor-pointer transition-all hover:border-primary/40 group",
                    selectedId === pb.id ? "border-primary/60" : "border-border"
                  )}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold font-mono">{pb.name}</span>
                        <Badge className={cn("text-[10px] font-mono border px-1.5 py-0", severityColors[pb.severity])}>{pb.severity.toUpperCase()}</Badge>
                        <Badge className={cn("text-[10px] font-mono border px-1.5 py-0 flex items-center gap-1",
                          isRunning ? "text-primary border-primary/40 bg-primary/10 animate-pulse" : statusColors[pb.status])}>
                          {isRunning ? <><Zap className="w-3 h-3" />RUNNING</> : <>{statusIcons[pb.status]}{pb.status.toUpperCase()}</>}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{pb.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ml-3 mt-0.5 flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground mt-2">
                    <Zap className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{pb.trigger}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex gap-4 text-xs font-mono text-muted-foreground">
                      <span>{stepCount} steps</span>
                      <span>{pb.completedRuns} runs</span>
                      {pb.completedRuns > 0 && <span>avg {pb.avgRuntime}</span>}
                      <span className="text-emerald-400">{pb.automationRate}% auto</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs font-mono text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={e => { e.stopPropagation(); setSelectedId(pb.id); }}>
                        <Eye className="w-3 h-3 mr-1" />VIEW
                      </Button>
                      {pb.status === "active" && (
                        <Button size="sm" variant="ghost"
                          className={cn("h-6 px-2 text-xs font-mono", isRunning ? "text-destructive hover:bg-destructive/10" : "text-emerald-400 hover:bg-emerald-500/10")}
                          onClick={e => { e.stopPropagation(); handleRun(pb); }}>
                          {isRunning ? <><Square className="w-3 h-3 mr-1" />STOP</> : <><Play className="w-3 h-3 mr-1" />RUN</>}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-border gap-3">
                <FilterX className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm font-mono text-muted-foreground">No playbooks match your current filters.</p>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters}
                    className="text-xs font-mono text-primary border border-primary/30 px-3 py-1.5 hover:bg-primary/10 transition-colors flex items-center gap-1.5">
                    <FilterX className="w-3 h-3" /> CLEAR ALL FILTERS
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="bg-card border border-border p-5 self-start sticky top-6">
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <h3 className="text-sm font-bold font-mono leading-tight">{selected.name}</h3>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{selected.description}</p>

                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[10px] font-mono border px-2 py-0.5 flex items-center gap-1",
                    runningId === selected.id ? "text-primary border-primary/40 bg-primary/10 animate-pulse" : statusColors[selected.status])}>
                    {runningId === selected.id ? <><Zap className="w-3 h-3" />RUNNING</> : <>{statusIcons[selected.status]}{selected.status.toUpperCase()}</>}
                  </Badge>
                  <Badge className={cn("text-[10px] font-mono border px-2 py-0.5", severityColors[selected.severity])}>
                    {selected.severity.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {[
                    ["Category",   selected.category],
                    ["Trigger",    selected.trigger],
                    ["Steps",      Array.isArray(selected.steps) ? selected.steps.length : 0],
                    ["Total Runs", selected.completedRuns],
                    ["Avg Runtime", selected.avgRuntime],
                    ["Last Run",   deriveLastRun(selected)],
                    ["Automation", `${selected.automationRate}%`],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex justify-between text-xs font-mono gap-2">
                      <span className="text-muted-foreground flex-shrink-0">{k}</span>
                      <span className="text-foreground text-right truncate">{String(v)}</span>
                    </div>
                  ))}
                </div>

                {/* Step list */}
                {Array.isArray(selected.steps) && selected.steps.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground font-mono mb-2 tracking-wider">STEPS</div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {selected.steps.map((s, i) => (
                        <div key={s.id ?? i} className="flex items-center gap-2 text-[10px] font-mono">
                          <span className="text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}.</span>
                          <span className="flex-1 truncate">{s.action}</span>
                          <span className={cn("flex-shrink-0 px-1.5 py-0.5 border text-[9px]",
                            s.automated ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-muted-foreground border-border bg-muted/30"
                          )}>{s.automated ? "AUTO" : "MANUAL"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">AUTOMATION RATE</div>
                  <div className="w-full bg-muted h-2">
                    <div className="bg-emerald-500 h-2 transition-all" style={{ width: `${selected.automationRate}%` }} />
                  </div>
                  <div className="text-right text-xs text-emerald-400 font-mono mt-1">{selected.automationRate}%</div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  {selected.status === "active" && (
                    <Button
                      className={cn("w-full font-mono text-xs gap-2 border transition-all",
                        runningId === selected.id
                          ? "bg-destructive/10 border-destructive/40 text-destructive hover:bg-destructive/20"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                      )}
                      onClick={() => handleRun(selected)}>
                      {runningId === selected.id
                        ? <><Square className="w-3 h-3" /> STOP EXECUTION</>
                        : <><Play className="w-3 h-3" /> TRIGGER PLAYBOOK</>
                      }
                    </Button>
                  )}
                  {selected.status === "draft" && (
                    <Button className="w-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-mono text-xs gap-2"
                      onClick={() => handleSetStatus(selected, "active")}>
                      <Play className="w-3 h-3" /> ACTIVATE PLAYBOOK
                    </Button>
                  )}
                  {selected.status === "paused" && (
                    <Button className="w-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 font-mono text-xs gap-2"
                      onClick={() => handleSetStatus(selected, "active")}>
                      <Play className="w-3 h-3" /> RESUME PLAYBOOK
                    </Button>
                  )}
                  {selected.status === "active" && !runningId && (
                    <Button variant="ghost" className="w-full border border-border text-muted-foreground hover:text-foreground font-mono text-xs gap-2 h-8"
                      onClick={() => handleSetStatus(selected, "paused")}>
                      <Pause className="w-3 h-3" /> PAUSE PLAYBOOK
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12 space-y-3">
                <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground font-mono">Select a playbook to view details</p>
                <button onClick={openBlank} className="text-xs font-mono text-primary/70 hover:text-primary transition-colors flex items-center gap-1 mt-1">
                  <Plus className="w-3 h-3" /> or create a new one
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Playbook Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-popover border border-border text-popover-foreground max-w-lg font-mono">
          <DialogHeader>
            <DialogTitle className="text-primary tracking-widest text-sm font-mono">NEW PLAYBOOK</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground tracking-wider">PLAYBOOK NAME *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ransomware Containment Response"
                className="bg-muted/60 border-border font-mono text-xs h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground tracking-wider">DESCRIPTION</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe what this playbook does and when it should run..."
                className="bg-muted/60 border-border font-mono text-xs resize-none h-16" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground tracking-wider">TRIGGER CONDITION *</Label>
              <Input value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
                placeholder="e.g. Detection: Ransomware / Encryption Activity"
                className="bg-muted/60 border-border font-mono text-xs h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground tracking-wider">CATEGORY</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-muted/60 border-border font-mono text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Incident Response", "Threat Intel", "Identity", "Data Loss", "Vulnerability Mgmt", "Cloud Security", "Application Security"].map(c => (
                      <SelectItem key={c} value={c} className="font-mono text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground tracking-wider">SEVERITY</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v as PlaybookSeverity }))}>
                  <SelectTrigger className="bg-muted/60 border-border font-mono text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["critical", "high", "medium", "info"] as PlaybookSeverity[]).map(s => (
                      <SelectItem key={s} value={s} className="font-mono text-xs capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground tracking-wider">NUMBER OF STEPS</Label>
                <Input type="number" min="1" max="50" value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                  className="bg-muted/60 border-border font-mono text-xs h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground tracking-wider">AUTOMATION RATE %</Label>
                <Input type="number" min="0" max="100" value={form.automationRate} onChange={e => setForm(f => ({ ...f, automationRate: e.target.value }))}
                  className="bg-muted/60 border-border font-mono text-xs h-9" />
              </div>
            </div>
            {formError && (
              <div className="text-xs font-mono text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">{formError}</div>
            )}
            <div className="flex gap-3 pt-1">
              <Button onClick={() => setModalOpen(false)} variant="ghost"
                className="flex-1 border border-border text-muted-foreground hover:text-foreground font-mono text-xs h-9">
                CANCEL
              </Button>
              <Button onClick={handleCreate} disabled={creating}
                className="flex-1 bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 font-mono text-xs h-9 gap-2 disabled:opacity-50">
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                CREATE PLAYBOOK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
