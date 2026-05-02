import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Play, Pause, CheckCircle, Clock, AlertTriangle, Plus, Search, Filter, ChevronRight, Zap, Bot, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const MOCK_PLAYBOOKS = [
  {
    id: "pb-001",
    name: "Ransomware Incident Response",
    description: "Automated triage, isolation, and remediation workflow for ransomware detections",
    trigger: "Detection: Ransomware / Encryption Activity",
    category: "Incident Response",
    steps: 12,
    completedRuns: 47,
    avgRuntime: "4m 23s",
    status: "active",
    severity: "critical",
    lastRun: "2 hours ago",
    automationRate: 94,
  },
  {
    id: "pb-002",
    name: "Phishing Email Triage",
    description: "Extract IOCs from reported phishing emails, query threat intel, and auto-quarantine",
    trigger: "Email Report / Alert: Suspicious Email",
    category: "Threat Intel",
    steps: 8,
    completedRuns: 312,
    avgRuntime: "1m 12s",
    status: "active",
    severity: "high",
    lastRun: "15 min ago",
    automationRate: 88,
  },
  {
    id: "pb-003",
    name: "Brute Force Account Lockout",
    description: "Detect brute force patterns, temporarily lock accounts, alert user and admin",
    trigger: "Detection: Multiple Failed Auth",
    category: "Identity",
    steps: 6,
    completedRuns: 189,
    avgRuntime: "45s",
    status: "active",
    severity: "medium",
    lastRun: "1 hour ago",
    automationRate: 100,
  },
  {
    id: "pb-004",
    name: "Lateral Movement Detection",
    description: "Map lateral movement paths, isolate compromised hosts, preserve evidence",
    trigger: "Detection: Lateral Movement / SMB Anomaly",
    category: "Incident Response",
    steps: 15,
    completedRuns: 23,
    avgRuntime: "8m 45s",
    status: "active",
    severity: "critical",
    lastRun: "3 days ago",
    automationRate: 76,
  },
  {
    id: "pb-005",
    name: "Threat Intel Enrichment",
    description: "Automatically enrich all new IOCs with VirusTotal, AbuseIPDB, and MISP lookups",
    trigger: "New IOC Ingested",
    category: "Threat Intel",
    steps: 5,
    completedRuns: 2847,
    avgRuntime: "12s",
    status: "active",
    severity: "info",
    lastRun: "5 min ago",
    automationRate: 100,
  },
  {
    id: "pb-006",
    name: "Privilege Escalation Response",
    description: "Detect and respond to privilege escalation attempts with automated evidence collection",
    trigger: "Detection: Privilege Escalation",
    category: "Identity",
    steps: 10,
    completedRuns: 34,
    avgRuntime: "3m 10s",
    status: "draft",
    severity: "high",
    lastRun: "Never",
    automationRate: 65,
  },
  {
    id: "pb-007",
    name: "Data Exfiltration Response",
    description: "Block data transfer, collect forensic artefacts, and notify DLP team automatically",
    trigger: "Detection: Unusual Data Transfer",
    category: "Data Loss",
    steps: 11,
    completedRuns: 8,
    avgRuntime: "6m 55s",
    status: "paused",
    severity: "critical",
    lastRun: "1 week ago",
    automationRate: 82,
  },
];

const CATEGORIES = ["All", "Incident Response", "Threat Intel", "Identity", "Data Loss"];
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

export default function Playbooks() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<typeof MOCK_PLAYBOOKS[0] | null>(null);

  const filtered = MOCK_PLAYBOOKS.filter(pb => {
    if (category !== "All" && pb.category !== category) return false;
    if (status !== "All" && pb.status !== status) return false;
    if (search && !pb.name.toLowerCase().includes(search.toLowerCase()) && !pb.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalRuns = MOCK_PLAYBOOKS.reduce((s, p) => s + p.completedRuns, 0);
  const activeCount = MOCK_PLAYBOOKS.filter(p => p.status === "active").length;
  const avgAutomation = Math.round(MOCK_PLAYBOOKS.reduce((s, p) => s + p.automationRate, 0) / MOCK_PLAYBOOKS.length);

  function handleRun(pb: typeof MOCK_PLAYBOOKS[0]) {
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
        <Button className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-mono text-xs gap-2">
          <Plus className="w-4 h-4" /> NEW PLAYBOOK
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "TOTAL PLAYBOOKS", value: MOCK_PLAYBOOKS.length, icon: BookOpen, color: "cyan" },
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
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search playbooks..."
            className="pl-9 bg-slate-900/60 border-slate-700/50 text-slate-200 placeholder-slate-600 font-mono text-xs h-8"
          />
        </div>
        <div className="flex gap-2">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={cn("px-3 py-1 rounded text-xs font-mono border transition-all",
                category === c ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "bg-slate-900/60 border-slate-700/50 text-slate-400 hover:border-slate-500"
              )}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={cn("px-3 py-1 rounded text-xs font-mono border transition-all capitalize",
                status === s ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "bg-slate-900/60 border-slate-700/50 text-slate-400 hover:border-slate-500"
              )}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Playbook list */}
        <div className="col-span-2 space-y-3">
          {filtered.map(pb => (
            <div key={pb.id}
              onClick={() => setSelected(pb)}
              className={cn("bg-slate-900/60 border rounded-lg p-4 cursor-pointer transition-all hover:border-cyan-500/40 group",
                selected?.id === pb.id ? "border-cyan-500/60 bg-slate-900/80" : "border-slate-700/50"
              )}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
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
              <div className="flex items-center gap-4 text-xs font-mono text-slate-500 mt-3">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {pb.trigger}</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex gap-4 text-xs font-mono text-slate-500">
                  <span>{pb.steps} steps</span>
                  <span>{pb.completedRuns} runs</span>
                  <span>avg {pb.avgRuntime}</span>
                  <span className="text-emerald-400">{pb.automationRate}% auto</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs font-mono text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                    onClick={e => { e.stopPropagation(); setSelected(pb); }}>
                    <Eye className="w-3 h-3 mr-1" /> VIEW
                  </Button>
                  {pb.status === "active" && (
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs font-mono text-emerald-400 hover:bg-emerald-500/10"
                      onClick={e => { e.stopPropagation(); handleRun(pb); }}>
                      <Play className="w-3 h-3 mr-1" /> RUN
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-600 font-mono text-sm">
              No playbooks match your filters.
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-5">
          {selected ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100 font-mono">{selected.name}</h3>
                </div>
                <p className="text-xs text-slate-500 font-mono">{selected.description}</p>
              </div>
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
                  <div key={String(k)} className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500">{k}</span>
                    <span className="text-slate-200">{String(v)}</span>
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
              {selected.status === "active" && (
                <Button className="w-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-mono text-xs gap-2 mt-2"
                  onClick={() => handleRun(selected)}>
                  <Play className="w-3 h-3" /> TRIGGER PLAYBOOK
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-700" />
              <p className="text-xs text-slate-600 font-mono">Select a playbook to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
