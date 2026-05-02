import { useState } from "react";
import { BookOpen, Play, Pause, Clock, Plus, Search, ChevronRight, Zap, Bot, Eye, X, Lightbulb, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type PlaybookStatus = "active" | "paused" | "draft";
type PlaybookSeverity = "critical" | "high" | "medium" | "info";

interface Playbook {
  id: string;
  name: string;
  description: string;
  trigger: string;
  category: string;
  steps: number;
  completedRuns: number;
  avgRuntime: string;
  status: PlaybookStatus;
  severity: PlaybookSeverity;
  lastRun: string;
  automationRate: number;
}

const INITIAL_PLAYBOOKS: Playbook[] = [
  {
    id: "pb-001", name: "Ransomware Incident Response",
    description: "Automated triage, isolation, and remediation workflow for ransomware detections",
    trigger: "Detection: Ransomware / Encryption Activity", category: "Incident Response",
    steps: 12, completedRuns: 47, avgRuntime: "4m 23s", status: "active", severity: "critical", lastRun: "2 hours ago", automationRate: 94,
  },
  {
    id: "pb-002", name: "Phishing Email Triage",
    description: "Extract IOCs from reported phishing emails, query threat intel, and auto-quarantine",
    trigger: "Email Report / Alert: Suspicious Email", category: "Threat Intel",
    steps: 8, completedRuns: 312, avgRuntime: "1m 12s", status: "active", severity: "high", lastRun: "15 min ago", automationRate: 88,
  },
  {
    id: "pb-003", name: "Brute Force Account Lockout",
    description: "Detect brute force patterns, temporarily lock accounts, alert user and admin",
    trigger: "Detection: Multiple Failed Auth", category: "Identity",
    steps: 6, completedRuns: 189, avgRuntime: "45s", status: "active", severity: "medium", lastRun: "1 hour ago", automationRate: 100,
  },
  {
    id: "pb-004", name: "Lateral Movement Detection",
    description: "Map lateral movement paths, isolate compromised hosts, preserve evidence",
    trigger: "Detection: Lateral Movement / SMB Anomaly", category: "Incident Response",
    steps: 15, completedRuns: 23, avgRuntime: "8m 45s", status: "active", severity: "critical", lastRun: "3 days ago", automationRate: 76,
  },
  {
    id: "pb-005", name: "Threat Intel Enrichment",
    description: "Automatically enrich all new IOCs with VirusTotal, AbuseIPDB, and MISP lookups",
    trigger: "New IOC Ingested", category: "Threat Intel",
    steps: 5, completedRuns: 2847, avgRuntime: "12s", status: "active", severity: "info", lastRun: "5 min ago", automationRate: 100,
  },
  {
    id: "pb-006", name: "Privilege Escalation Response",
    description: "Detect and respond to privilege escalation attempts with automated evidence collection",
    trigger: "Detection: Privilege Escalation", category: "Identity",
    steps: 10, completedRuns: 34, avgRuntime: "3m 10s", status: "draft", severity: "high", lastRun: "Never", automationRate: 65,
  },
  {
    id: "pb-007", name: "Data Exfiltration Response",
    description: "Block data transfer, collect forensic artefacts, and notify DLP team automatically",
    trigger: "Detection: Unusual Data Transfer", category: "Data Loss",
    steps: 11, completedRuns: 8, avgRuntime: "6m 55s", status: "paused", severity: "critical", lastRun: "1 week ago", automationRate: 82,
  },
];

const TEMPLATE_SUGGESTIONS = [
  { name: "Zero-Day Vulnerability Response", description: "Rapid triage and isolation for newly disclosed CVEs affecting in-scope assets.", trigger: "Threat Intel: CVE Advisory / Zero-Day Alert", category: "Vulnerability Mgmt", severity: "critical" as PlaybookSeverity, steps: 9, automationRate: 72 },
  { name: "Cloud Misconfiguration Alert", description: "Detect and auto-remediate exposed S3 buckets, open security groups, and IAM over-permissions.", trigger: "CSPM Alert: Misconfiguration Detected", category: "Cloud Security", severity: "high" as PlaybookSeverity, steps: 7, automationRate: 91 },
  { name: "Malware Quarantine & Analysis", description: "Sandbox execution, hash lookup, EDR quarantine, and automatic IOC extraction.", trigger: "Detection: Malware / Suspicious Binary", category: "Incident Response", severity: "high" as PlaybookSeverity, steps: 10, automationRate: 85 },
  { name: "API Abuse Detection Response", description: "Rate-limit, block, and investigate abusive API clients with automatic abuse report generation.", trigger: "Detection: API Rate Limit / Anomalous Usage", category: "Application Security", severity: "medium" as PlaybookSeverity, steps: 6, automationRate: 95 },
  { name: "Critical Asset Access Anomaly", description: "Respond to out-of-hours or geo-impossible access to crown-jewel assets and databases.", trigger: "UEBA Alert: Critical Asset Access", category: "Identity", severity: "critical" as PlaybookSeverity, steps: 8, automationRate: 78 },
  { name: "Container / K8s Security Incident", description: "Detect container escapes, privilege escalation in pods, and malicious images with auto-eviction.", trigger: "Detection: Container Escape / K8s Anomaly", category: "Cloud Security", severity: "critical" as PlaybookSeverity, steps: 13, automationRate: 68 },
  { name: "Emergency Patch Deployment", description: "Auto-prioritise affected hosts, push patch via WSUS/Ansible, verify compliance, and create remediation ticket.", trigger: "Vulnerability: Critical CVSS ≥ 9.0 Detected", category: "Vulnerability Mgmt", severity: "high" as PlaybookSeverity, steps: 8, automationRate: 80 },
  { name: "Credential Breach Notification", description: "Cross-reference HIBP and dark web feeds, force password reset, invalidate sessions, and notify user.", trigger: "Threat Intel: Credential Exposure Detected", category: "Identity", severity: "high" as PlaybookSeverity, steps: 7, automationRate: 93 },
];

const CATEGORIES = ["All", "Incident Response", "Threat Intel", "Identity", "Data Loss", "Vulnerability Mgmt", "Cloud Security", "Application Security"];
const STATUSES = ["All", "active", "paused", "draft"];

const severityColors: Record<string, string> = {
  critical: "text-red-400 border-red-500/40 bg-red-500/10",
  high:     "text-orange-400 border-orange-500/40 bg-orange-500/10",
  medium:   "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
  info:     "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
};
const statusColors: Record<string, string> = {
  active: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  paused: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
  draft:  "text-slate-400 border-slate-500/40 bg-slate-500/10",
};
const statusIcons: Record<string, React.ReactNode> = {
  active: <Play className="w-3 h-3" />,
  paused: <Pause className="w-3 h-3" />,
  draft:  <Clock className="w-3 h-3" />,
};

const EMPTY_FORM = { name: "", description: "", trigger: "", category: "Incident Response", severity: "high" as PlaybookSeverity, steps: "6", automationRate: "80" };

export default function Playbooks() {
  const { toast } = useToast();
  const [playbooks, setPlaybooks] = useState<Playbook[]>(INITIAL_PLAYBOOKS);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<Playbook | null>(INITIAL_PLAYBOOKS[0]);

  const [modalOpen, setModalOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const filtered = playbooks.filter(pb => {
    if (category !== "All" && pb.category !== category) return false;
    if (status !== "All" && pb.status !== status) return false;
    if (search && !pb.name.toLowerCase().includes(search.toLowerCase()) && !pb.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalRuns = playbooks.reduce((s, p) => s + p.completedRuns, 0);
  const activeCount = playbooks.filter(p => p.status === "active").length;
  const avgAutomation = Math.round(playbooks.reduce((s, p) => s + p.automationRate, 0) / playbooks.length);

  function openBlank() { setForm(EMPTY_FORM); setFormError(""); setShowSuggestions(false); setModalOpen(true); }

  function prefillFromTemplate(t: typeof TEMPLATE_SUGGESTIONS[0]) {
    setForm({ name: t.name, description: t.description, trigger: t.trigger, category: t.category, severity: t.severity, steps: String(t.steps), automationRate: String(t.automationRate) });
    setFormError("");
    setShowSuggestions(false);
    setModalOpen(true);
  }

  function handleCreate() {
    if (!form.name.trim()) { setFormError("Playbook name is required."); return; }
    if (!form.trigger.trim()) { setFormError("Trigger condition is required."); return; }
    const newPb: Playbook = {
      id: `pb-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim(),
      trigger: form.trigger.trim(),
      category: form.category,
      severity: form.severity,
      steps: Math.max(1, parseInt(form.steps) || 5),
      automationRate: Math.min(100, Math.max(0, parseInt(form.automationRate) || 70)),
      completedRuns: 0,
      avgRuntime: "—",
      status: "draft",
      lastRun: "Never",
    };
    setPlaybooks(prev => [newPb, ...prev]);
    setModalOpen(false);
    setSelected(newPb);
    toast({ title: "Playbook created", description: `"${newPb.name}" saved as draft. Activate it to start receiving triggers.` });
  }

  function handleRun(pb: Playbook) {
    toast({ title: `Playbook triggered: ${pb.name}`, description: "Execution started. Monitor in the incident timeline." });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-cyan-400 font-mono">AI PLAYBOOKS</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">Automated response workflows · SOAR engine</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowSuggestions(s => !s)}
            variant="ghost" className="border border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 font-mono text-xs gap-2 h-8">
            <Lightbulb className="w-3.5 h-3.5" /> SUGGESTIONS
            <ChevronDown className={cn("w-3 h-3 transition-transform", showSuggestions && "rotate-180")} />
          </Button>
          <Button onClick={openBlank}
            className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-mono text-xs gap-2">
            <Plus className="w-4 h-4" /> NEW PLAYBOOK
          </Button>
        </div>
      </div>

      {/* Suggestions panel */}
      {showSuggestions && (
        <div className="bg-slate-900/80 border border-cyan-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono text-cyan-400 tracking-wider">RECOMMENDED PLAYBOOKS FOR YOUR THREAT LANDSCAPE</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATE_SUGGESTIONS.map(t => (
              <button key={t.name} onClick={() => prefillFromTemplate(t)}
                className="text-left p-3 border border-slate-700/50 rounded-lg hover:border-cyan-500/40 hover:bg-slate-800/60 transition-all group">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-200 font-mono group-hover:text-cyan-300 transition-colors">{t.name}</span>
                  <Badge className={cn("text-[9px] font-mono border px-1.5 py-0 flex-shrink-0", severityColors[t.severity])}>{t.severity.toUpperCase()}</Badge>
                </div>
                <p className="text-[10px] text-slate-500 font-mono leading-relaxed mb-2">{t.description}</p>
                <div className="flex gap-3 text-[10px] font-mono text-slate-600">
                  <span>{t.steps} steps</span>
                  <span>{t.automationRate}% auto</span>
                  <span className="text-slate-500">{t.category}</span>
                </div>
                <div className="mt-2 text-[10px] font-mono text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity">
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
          { label: "TOTAL PLAYBOOKS", value: playbooks.length, icon: BookOpen, color: "cyan" },
          { label: "ACTIVE", value: activeCount, icon: Play, color: "emerald" },
          { label: "TOTAL EXECUTIONS", value: totalRuns.toLocaleString(), icon: Zap, color: "amber" },
          { label: "AVG AUTOMATION", value: `${avgAutomation}%`, icon: Bot, color: "violet" },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-mono tracking-wider">{stat.label}</span>
              <stat.icon className={cn("w-4 h-4", `text-${stat.color}-400`)} />
            </div>
            <div className={cn("text-2xl font-bold font-mono", `text-${stat.color}-400`)}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search playbooks..."
            className="pl-9 bg-slate-900/60 border-slate-700/50 text-slate-200 placeholder-slate-600 font-mono text-xs h-8" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={cn("px-2.5 py-1 rounded text-xs font-mono border transition-all",
                category === c ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "bg-slate-900/60 border-slate-700/50 text-slate-400 hover:border-slate-500"
              )}>{c}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={cn("px-2.5 py-1 rounded text-xs font-mono border transition-all capitalize",
                status === s ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "bg-slate-900/60 border-slate-700/50 text-slate-400 hover:border-slate-500"
              )}>{s}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Playbook list */}
        <div className="col-span-2 space-y-3">
          {filtered.map(pb => (
            <div key={pb.id} onClick={() => setSelected(pb)}
              className={cn("bg-slate-900/60 border rounded-lg p-4 cursor-pointer transition-all hover:border-cyan-500/40 group",
                selected?.id === pb.id ? "border-cyan-500/60 bg-slate-900/80" : "border-slate-700/50"
              )}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-slate-100 font-mono">{pb.name}</span>
                    <Badge className={cn("text-[10px] font-mono border px-1.5 py-0", severityColors[pb.severity])}>{pb.severity.toUpperCase()}</Badge>
                    <Badge className={cn("text-[10px] font-mono border px-1.5 py-0 flex items-center gap-1", statusColors[pb.status])}>
                      {statusIcons[pb.status]}{pb.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{pb.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors ml-3 mt-0.5 flex-shrink-0" />
              </div>
              <div className="flex items-center gap-1 text-xs font-mono text-slate-500 mt-2">
                <Zap className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{pb.trigger}</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex gap-4 text-xs font-mono text-slate-500">
                  <span>{pb.steps} steps</span>
                  <span>{pb.completedRuns} runs</span>
                  {pb.completedRuns > 0 && <span>avg {pb.avgRuntime}</span>}
                  <span className="text-emerald-400">{pb.automationRate}% auto</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs font-mono text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                    onClick={e => { e.stopPropagation(); setSelected(pb); }}>
                    <Eye className="w-3 h-3 mr-1" />VIEW
                  </Button>
                  {pb.status === "active" && (
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs font-mono text-emerald-400 hover:bg-emerald-500/10"
                      onClick={e => { e.stopPropagation(); handleRun(pb); }}>
                      <Play className="w-3 h-3 mr-1" />RUN
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-600 font-mono text-sm border border-dashed border-slate-800 rounded-lg">
              No playbooks match your filters.
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-5 self-start sticky top-6">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <h3 className="text-sm font-bold text-slate-100 font-mono leading-tight">{selected.name}</h3>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-slate-400 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-500 font-mono">{selected.description}</p>
              <div className="space-y-2">
                {[
                  ["Category", selected.category],
                  ["Trigger", selected.trigger],
                  ["Steps", selected.steps],
                  ["Total Runs", selected.completedRuns],
                  ["Avg Runtime", selected.avgRuntime],
                  ["Last Run", selected.lastRun],
                  ["Automation", `${selected.automationRate}%`],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between text-xs font-mono gap-2">
                    <span className="text-slate-500 flex-shrink-0">{k}</span>
                    <span className="text-slate-200 text-right truncate">{String(v)}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs text-slate-500 font-mono mb-1">AUTOMATION RATE</div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${selected.automationRate}%` }} />
                </div>
                <div className="text-right text-xs text-emerald-400 font-mono mt-1">{selected.automationRate}%</div>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                {selected.status === "active" && (
                  <Button className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-mono text-xs gap-2"
                    onClick={() => handleRun(selected)}>
                    <Play className="w-3 h-3" /> TRIGGER PLAYBOOK
                  </Button>
                )}
                {selected.status === "draft" && (
                  <Button className="w-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-mono text-xs gap-2"
                    onClick={() => {
                      setPlaybooks(prev => prev.map(p => p.id === selected.id ? { ...p, status: "active" as PlaybookStatus } : p));
                      setSelected(prev => prev ? { ...prev, status: "active" } : null);
                      toast({ title: "Playbook activated", description: `"${selected.name}" is now live and listening for triggers.` });
                    }}>
                    <Play className="w-3 h-3" /> ACTIVATE PLAYBOOK
                  </Button>
                )}
                {selected.status === "paused" && (
                  <Button className="w-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 font-mono text-xs gap-2"
                    onClick={() => {
                      setPlaybooks(prev => prev.map(p => p.id === selected.id ? { ...p, status: "active" as PlaybookStatus } : p));
                      setSelected(prev => prev ? { ...prev, status: "active" } : null);
                      toast({ title: "Playbook resumed", description: `"${selected.name}" has been reactivated.` });
                    }}>
                    <Play className="w-3 h-3" /> RESUME PLAYBOOK
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-700" />
              <p className="text-xs text-slate-600 font-mono">Select a playbook to view details</p>
              <button onClick={openBlank} className="text-xs font-mono text-cyan-500/70 hover:text-cyan-400 transition-colors flex items-center gap-1 mt-1">
                <Plus className="w-3 h-3" /> or create a new one
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Playbook Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border border-slate-700/70 text-slate-100 max-w-lg font-mono">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 tracking-widest text-sm font-mono">NEW PLAYBOOK</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 tracking-wider">PLAYBOOK NAME *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ransomware Containment Response"
                className="bg-slate-800/80 border-slate-700/60 text-slate-100 placeholder-slate-600 font-mono text-xs h-9" />
            </div>
            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 tracking-wider">DESCRIPTION</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does this playbook do? What threats does it address?"
                className="bg-slate-800/80 border-slate-700/60 text-slate-100 placeholder-slate-600 font-mono text-xs resize-none h-20" />
            </div>
            {/* Trigger */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 tracking-wider">TRIGGER CONDITION *</Label>
              <Input value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
                placeholder="e.g. Detection: Ransomware Activity"
                className="bg-slate-800/80 border-slate-700/60 text-slate-100 placeholder-slate-600 font-mono text-xs h-9" />
            </div>
            {/* Category + Severity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 tracking-wider">CATEGORY</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-slate-800/80 border-slate-700/60 text-slate-200 font-mono text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700/60 text-slate-200 font-mono text-xs">
                    {["Incident Response", "Threat Intel", "Identity", "Data Loss", "Vulnerability Mgmt", "Cloud Security", "Application Security"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 tracking-wider">SEVERITY</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v as PlaybookSeverity }))}>
                  <SelectTrigger className="bg-slate-800/80 border-slate-700/60 text-slate-200 font-mono text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700/60 text-slate-200 font-mono text-xs">
                    {(["critical", "high", "medium", "info"] as PlaybookSeverity[]).map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Steps + Automation */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 tracking-wider">NUMBER OF STEPS</Label>
                <Input type="number" min={1} max={30} value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                  className="bg-slate-800/80 border-slate-700/60 text-slate-100 font-mono text-xs h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 tracking-wider">AUTOMATION RATE %</Label>
                <Input type="number" min={0} max={100} value={form.automationRate} onChange={e => setForm(f => ({ ...f, automationRate: e.target.value }))}
                  className="bg-slate-800/80 border-slate-700/60 text-slate-100 font-mono text-xs h-9" />
              </div>
            </div>
            {formError && (
              <div className="text-xs text-red-400 font-mono bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{formError}</div>
            )}
            <div className="flex gap-3 pt-1">
              <Button onClick={() => setModalOpen(false)} variant="ghost"
                className="flex-1 border border-slate-700/60 text-slate-400 hover:text-slate-200 font-mono text-xs h-9">
                CANCEL
              </Button>
              <Button onClick={handleCreate}
                className="flex-1 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30 font-mono text-xs h-9 gap-2">
                <Plus className="w-3.5 h-3.5" /> CREATE PLAYBOOK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
