import { useState } from "react";
import { BarChart3, User, AlertTriangle, TrendingUp, Activity, Eye, Clock, Shield, Search, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MOCK_ENTITIES = [
  {
    id: "u-001", type: "user", name: "john.harrison@corp.com", displayName: "John Harrison",
    riskScore: 92, riskTrend: "up", anomalies: 7, lastActivity: "3 min ago",
    department: "Finance", location: "Chicago, IL",
    flags: ["Unusual after-hours access", "Mass file download", "New device login"],
    baseline: { loginTime: "08:00–17:00", avgDataAccess: "2.4 GB/day", typicalGeo: "Chicago, IL" },
    recent: { loginTime: "02:14 AM", dataAccess: "18.7 GB", geo: "Frankfurt, DE" },
  },
  {
    id: "u-002", type: "user", name: "sarah.kim@corp.com", displayName: "Sarah Kim",
    riskScore: 74, riskTrend: "up", anomalies: 4, lastActivity: "22 min ago",
    department: "HR", location: "Austin, TX",
    flags: ["Bulk export of PII records", "Privilege escalation attempt"],
    baseline: { loginTime: "09:00–18:00", avgDataAccess: "500 MB/day", typicalGeo: "Austin, TX" },
    recent: { loginTime: "11:30 AM", dataAccess: "4.2 GB", geo: "Austin, TX" },
  },
  {
    id: "h-001", type: "host", name: "WS-FIN-0047", displayName: "WS-FIN-0047",
    riskScore: 81, riskTrend: "stable", anomalies: 5, lastActivity: "1 hour ago",
    department: "Finance Workstation", location: "Chicago DC",
    flags: ["Lateral movement detected", "Unusual outbound port scan", "New scheduled task"],
    baseline: { loginTime: "N/A", avgDataAccess: "800 MB/day", typicalGeo: "Chicago DC" },
    recent: { loginTime: "N/A", dataAccess: "3.1 GB", geo: "Chicago DC" },
  },
  {
    id: "u-003", type: "user", name: "mike.torres@corp.com", displayName: "Mike Torres",
    riskScore: 58, riskTrend: "down", anomalies: 2, lastActivity: "45 min ago",
    department: "IT Operations", location: "New York, NY",
    flags: ["VPN from unusual country"],
    baseline: { loginTime: "07:00–16:00", avgDataAccess: "5 GB/day", typicalGeo: "New York, NY" },
    recent: { loginTime: "08:15 AM", dataAccess: "5.8 GB", geo: "Toronto, CA" },
  },
  {
    id: "sa-001", type: "service", name: "svc-databackup", displayName: "svc-databackup",
    riskScore: 45, riskTrend: "stable", anomalies: 1, lastActivity: "2 hours ago",
    department: "Service Account", location: "Internal",
    flags: ["Accessing resources outside normal scope"],
    baseline: { loginTime: "01:00–03:00", avgDataAccess: "20 GB/day", typicalGeo: "Internal" },
    recent: { loginTime: "01:05 AM", dataAccess: "21 GB", geo: "Internal" },
  },
  {
    id: "u-004", type: "user", name: "linda.chen@corp.com", displayName: "Linda Chen",
    riskScore: 22, riskTrend: "down", anomalies: 0, lastActivity: "2 hours ago",
    department: "Engineering", location: "Seattle, WA",
    flags: [],
    baseline: { loginTime: "09:00–18:00", avgDataAccess: "8 GB/day", typicalGeo: "Seattle, WA" },
    recent: { loginTime: "09:10 AM", dataAccess: "7.6 GB", geo: "Seattle, WA" },
  },
];

const riskColor = (score: number) =>
  score >= 80 ? "text-red-400" : score >= 60 ? "text-orange-400" : score >= 40 ? "text-yellow-400" : "text-emerald-400";

const riskBg = (score: number) =>
  score >= 80 ? "bg-red-500" : score >= 60 ? "bg-orange-500" : score >= 40 ? "bg-yellow-500" : "bg-emerald-500";

const trendIcon = (t: string) =>
  t === "up" ? "↑" : t === "down" ? "↓" : "→";

const trendColor = (t: string) =>
  t === "up" ? "text-red-400" : t === "down" ? "text-emerald-400" : "text-slate-400";

export default function BehavioralAnalytics() {
  const [selected, setSelected] = useState<typeof MOCK_ENTITIES[0] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "user" | "host" | "service">("all");

  const filtered = MOCK_ENTITIES.filter(e => {
    if (filter !== "all" && e.type !== filter) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.displayName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.riskScore - a.riskScore);

  const highRisk = MOCK_ENTITIES.filter(e => e.riskScore >= 80).length;
  const medRisk = MOCK_ENTITIES.filter(e => e.riskScore >= 40 && e.riskScore < 80).length;
  const totalAnomalies = MOCK_ENTITIES.reduce((s, e) => s + e.anomalies, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-cyan-400 font-mono">BEHAVIORAL ANALYTICS</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">User & Entity Behavior Analytics · UEBA engine · ML baseline deviation</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "MONITORED ENTITIES", value: MOCK_ENTITIES.length, color: "cyan", icon: User },
          { label: "HIGH RISK", value: highRisk, color: "red", icon: AlertTriangle },
          { label: "MEDIUM RISK", value: medRisk, color: "orange", icon: TrendingUp },
          { label: "TOTAL ANOMALIES", value: totalAnomalies, color: "amber", icon: Activity },
        ].map(s => (
          <div key={s.label} className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-mono tracking-wider">{s.label}</span>
              <s.icon className={cn("w-4 h-4", `text-${s.color}-400`)} />
            </div>
            <div className={cn("text-2xl font-bold font-mono", `text-${s.color}-400`)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Risk heatmap bar */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4">
        <div className="text-xs text-slate-500 font-mono mb-3 tracking-wider">ENTITY RISK DISTRIBUTION</div>
        <div className="flex gap-1 h-6">
          {MOCK_ENTITIES.sort((a, b) => b.riskScore - a.riskScore).map(e => (
            <div key={e.id} className="flex-1 rounded-sm cursor-pointer transition-all hover:opacity-80"
              style={{ backgroundColor: `hsl(${Math.max(0, 120 - e.riskScore * 1.2)}, 70%, 45%)` }}
              title={`${e.displayName}: ${e.riskScore}`}
              onClick={() => setSelected(e)}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs font-mono text-slate-600 mt-1">
          <span>Critical Risk</span><span>Low Risk</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entities..."
            className="pl-9 bg-slate-900/60 border-slate-700/50 text-slate-200 placeholder-slate-600 font-mono text-xs h-8" />
        </div>
        <div className="flex gap-2">
          {(["all", "user", "host", "service"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1 rounded text-xs font-mono border transition-all capitalize",
                filter === f ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "bg-slate-900/60 border-slate-700/50 text-slate-400 hover:border-slate-500"
              )}>{f}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Entity list */}
        <div className="col-span-2 space-y-2">
          {filtered.map(entity => (
            <div key={entity.id} onClick={() => setSelected(entity)}
              className={cn("bg-slate-900/60 border rounded-lg p-4 cursor-pointer hover:border-cyan-500/40 transition-all group",
                selected?.id === entity.id ? "border-cyan-500/60" : "border-slate-700/50"
              )}>
              <div className="flex items-center gap-4">
                {/* Risk ring */}
                <div className="relative w-12 h-12 flex-shrink-0">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-800" />
                    <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3"
                      stroke={entity.riskScore >= 80 ? "#ef4444" : entity.riskScore >= 60 ? "#f97316" : entity.riskScore >= 40 ? "#eab308" : "#10b981"}
                      strokeDasharray={`${(entity.riskScore / 100) * 94.2} 94.2`} strokeLinecap="round" />
                  </svg>
                  <span className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold font-mono", riskColor(entity.riskScore))}>
                    {entity.riskScore}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-100 font-mono truncate">{entity.displayName}</span>
                    <Badge className="text-[10px] font-mono border border-slate-600/50 bg-slate-800/50 text-slate-400 px-1.5 py-0 capitalize">{entity.type}</Badge>
                    <span className={cn("text-xs font-mono font-bold", trendColor(entity.riskTrend))}>
                      {trendIcon(entity.riskTrend)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono truncate">{entity.name}</div>
                  <div className="flex items-center gap-3 mt-2 text-xs font-mono text-slate-500">
                    <span>{entity.department}</span>
                    <span className="text-red-400">{entity.anomalies} anomalies</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{entity.lastActivity}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {entity.flags.slice(0, 2).map(f => (
                    <Badge key={f} className="text-[9px] font-mono border border-red-500/30 bg-red-500/10 text-red-400 px-1.5 py-0 whitespace-nowrap">{f}</Badge>
                  ))}
                  {entity.flags.length > 2 && (
                    <span className="text-[9px] text-slate-600 font-mono">+{entity.flags.length - 2} more</span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-5">
          {selected ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100 font-mono">{selected.displayName}</h3>
                </div>
                <div className="text-xs text-slate-500 font-mono">{selected.name}</div>
              </div>
              {/* Risk score big */}
              <div className="text-center py-3 border border-slate-700/50 rounded-lg">
                <div className={cn("text-4xl font-black font-mono", riskColor(selected.riskScore))}>{selected.riskScore}</div>
                <div className="text-xs text-slate-500 font-mono mt-1">RISK SCORE</div>
                <div className="w-3/4 mx-auto bg-slate-800 rounded-full h-1.5 mt-2">
                  <div className={cn("h-1.5 rounded-full", riskBg(selected.riskScore))} style={{ width: `${selected.riskScore}%` }} />
                </div>
              </div>
              {/* Baseline vs recent */}
              <div>
                <div className="text-xs text-slate-500 font-mono mb-2 tracking-wider">BASELINE vs RECENT</div>
                <div className="space-y-2">
                  {[
                    ["Login Time", selected.baseline.loginTime, selected.recent.loginTime],
                    ["Data Access", selected.baseline.avgDataAccess, selected.recent.dataAccess],
                    ["Geography", selected.baseline.typicalGeo, selected.recent.geo],
                  ].map(([k, base, curr]) => (
                    <div key={String(k)} className="text-xs font-mono">
                      <div className="text-slate-500 mb-0.5">{k}</div>
                      <div className="flex gap-2 items-center">
                        <span className="text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded text-[10px]">{base}</span>
                        <span className="text-slate-600">→</span>
                        <span className={cn("px-2 py-0.5 rounded text-[10px]",
                          base === curr ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
                        )}>{curr}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Flags */}
              {selected.flags.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 font-mono mb-2 tracking-wider">ANOMALY FLAGS</div>
                  <div className="space-y-1.5">
                    {selected.flags.map(f => (
                      <div key={f} className="flex items-start gap-2 text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />{f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
              <Eye className="w-10 h-10 text-slate-700" />
              <p className="text-xs text-slate-600 font-mono">Select an entity to view behavioral profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
