import { useState, useEffect, useCallback } from "react";
import { BarChart3, User, AlertTriangle, TrendingUp, Activity, Eye, Clock, Shield, Search, ChevronRight, RefreshCcw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Entity {
  id: string;
  type: string;
  name: string;
  displayName: string;
  riskScore: number;
  riskTrend: "up" | "down" | "stable";
  anomalies: number;
  lastActivity: string;
  department: string;
  location: string;
  flags: string[];
  baseline: { loginTime: string; avgDataAccess: string; typicalGeo: string };
  recent: { loginTime: string; dataAccess: string; geo: string };
}

interface UebaAlert {
  id: number;
  entityId: string;
  displayName: string;
  alertType: string;
  severity: string;
  description: string;
  confidence: string;
  isAcknowledged: boolean;
  triggeredAt: string;
}

function timeAgo(ts: string | null): string {
  if (!ts) return "Unknown";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return `${Math.floor(diff / 86400000)} days ago`;
}

function profileToEntity(p: any): Entity {
  return {
    id: String(p.id),
    type: p.entityType,
    name: p.entityId,
    displayName: p.displayName,
    riskScore: p.riskScore,
    riskTrend: p.riskTrend,
    anomalies: p.anomalyCount,
    lastActivity: timeAgo(p.lastActivity),
    department: p.department ?? "Unknown",
    location: p.location ?? "Unknown",
    flags: Array.isArray(p.flags) ? p.flags : [],
    baseline: { loginTime: p.baselineLoginTime ?? "N/A", avgDataAccess: p.baselineDataAccess ?? "N/A", typicalGeo: p.baselineGeo ?? "N/A" },
    recent: { loginTime: p.recentLoginTime ?? p.baselineLoginTime ?? "N/A", dataAccess: p.recentDataAccess ?? p.baselineDataAccess ?? "N/A", geo: p.recentGeo ?? p.baselineGeo ?? "N/A" },
  };
}

const riskColor = (score: number) =>
  score >= 80 ? "text-red-400" : score >= 60 ? "text-orange-400" : score >= 40 ? "text-yellow-400" : "text-emerald-400";

const riskBg = (score: number) =>
  score >= 80 ? "bg-red-500" : score >= 60 ? "bg-orange-500" : score >= 40 ? "bg-yellow-500" : "bg-emerald-500";

const trendIcon = (t: string) => t === "up" ? "↑" : t === "down" ? "↓" : "→";
const trendColor = (t: string) => t === "up" ? "text-red-400" : t === "down" ? "text-emerald-400" : "text-muted-foreground";

const sevColors: Record<string, string> = {
  critical: "text-red-400 border-red-500/30 bg-red-500/10",
  high:     "text-orange-400 border-orange-500/30 bg-orange-500/10",
  medium:   "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  low:      "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
};

export default function BehavioralAnalytics() {
  const { toast } = useToast();
  const [entities, setEntities]   = useState<Entity[]>([]);
  const [alerts, setAlerts]       = useState<UebaAlert[]>([]);
  const [selected, setSelected]   = useState<Entity | null>(null);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<"all" | "user" | "host" | "service">("all");
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<"profile" | "alerts">("profile");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, alertsRes] = await Promise.all([
        fetch(`${BASE}/api/ueba/profiles`, { credentials: "include" }),
        fetch(`${BASE}/api/ueba/alerts`,   { credentials: "include" }),
      ]);
      if (profilesRes.ok) {
        const profiles = await profilesRes.json();
        const mapped: Entity[] = profiles.map(profileToEntity);
        setEntities(mapped);
        if (mapped.length > 0 && !selected) setSelected(mapped[0]);
      }
      if (alertsRes.ok) setAlerts(await alertsRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function acknowledgeAlert(alertId: number) {
    try {
      await fetch(`${BASE}/api/ueba/alerts/${alertId}/acknowledge`, { method: "PATCH", credentials: "include" });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, isAcknowledged: true } : a));
      toast({ title: "Alert acknowledged" });
    } catch {
      toast({ title: "Failed to acknowledge", variant: "destructive" });
    }
  }

  const filtered = entities.filter(e => {
    if (filter !== "all" && e.type !== filter) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.displayName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.riskScore - a.riskScore);

  const highRisk      = entities.filter(e => e.riskScore >= 80).length;
  const medRisk       = entities.filter(e => e.riskScore >= 40 && e.riskScore < 80).length;
  const totalAnomalies = entities.reduce((s, e) => s + e.anomalies, 0);
  const entityAlerts  = selected ? alerts.filter(a => a.entityId === selected.name) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-primary/70 tracking-widest mb-1">RAPID FORCE // BEHAVIORAL ANALYTICS</div>
          <h1 className="text-2xl font-bold tracking-wider">BEHAVIORAL ANALYTICS</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">User & Entity Behavior Analytics · UEBA engine · ML baseline deviation</p>
        </div>
        <Button onClick={fetchData} variant="ghost" size="sm" className="border border-border text-muted-foreground hover:text-primary font-mono text-xs gap-1.5 h-8">
          <RefreshCcw className="w-3.5 h-3.5" /> REFRESH
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "MONITORED ENTITIES", value: loading ? "—" : entities.length,    color: "text-primary",     icon: User },
          { label: "HIGH RISK",          value: loading ? "—" : highRisk,           color: "text-destructive", icon: AlertTriangle },
          { label: "MEDIUM RISK",        value: loading ? "—" : medRisk,            color: "text-accent",      icon: TrendingUp },
          { label: "TOTAL ANOMALIES",    value: loading ? "—" : totalAnomalies,     color: "text-amber-400",   icon: Activity },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-mono tracking-wider">{s.label}</span>
              <s.icon className={cn("w-4 h-4", s.color)} />
            </div>
            <div className={cn("text-2xl font-bold font-mono", s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Risk heatmap bar */}
      {entities.length > 0 && (
        <div className="bg-card border border-border p-4">
          <div className="text-xs text-muted-foreground font-mono mb-3 tracking-wider">ENTITY RISK DISTRIBUTION</div>
          <div className="flex gap-1 h-6">
            {[...entities].sort((a, b) => b.riskScore - a.riskScore).map(e => (
              <div key={e.id} className="flex-1 rounded-sm cursor-pointer transition-all hover:opacity-80"
                style={{ backgroundColor: `hsl(${Math.max(0, 120 - e.riskScore * 1.2)}, 70%, 45%)` }}
                title={`${e.displayName}: ${e.riskScore}`}
                onClick={() => setSelected(e)}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs font-mono text-muted-foreground mt-1">
            <span>Critical Risk</span><span>Low Risk</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entities..."
            className="pl-9 bg-card border-border font-mono text-xs h-8" />
        </div>
        <div className="flex gap-2">
          {(["all", "user", "host", "service"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1 text-xs font-mono border transition-all capitalize",
                filter === f ? "bg-primary/10 border-primary/40 text-primary" : "bg-card border-border text-muted-foreground hover:border-border"
              )}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground font-mono text-xs">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading entity profiles...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Entity list */}
          <div className="col-span-2 space-y-2">
            {filtered.map(entity => (
              <div key={entity.id} onClick={() => setSelected(entity)}
                className={cn("bg-card border p-4 cursor-pointer hover:border-primary/40 transition-all group",
                  selected?.id === entity.id ? "border-primary/60" : "border-border"
                )}>
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/50" />
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
                      <span className="text-sm font-semibold font-mono truncate">{entity.displayName}</span>
                      <Badge className="text-[10px] font-mono border border-border bg-muted/50 text-muted-foreground px-1.5 py-0 capitalize">{entity.type}</Badge>
                      <span className={cn("text-xs font-mono font-bold", trendColor(entity.riskTrend))}>{trendIcon(entity.riskTrend)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{entity.name}</div>
                    <div className="flex items-center gap-3 mt-2 text-xs font-mono text-muted-foreground">
                      <span>{entity.department}</span>
                      <span className="text-red-400">{entity.anomalies} anomalies</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{entity.lastActivity}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {entity.flags.slice(0, 2).map(f => (
                      <Badge key={f} className="text-[9px] font-mono border border-destructive/30 bg-destructive/10 text-destructive px-1.5 py-0 whitespace-nowrap">{f}</Badge>
                    ))}
                    {entity.flags.length > 2 && (
                      <span className="text-[9px] text-muted-foreground font-mono">+{entity.flags.length - 2} more</span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-border gap-3">
                <Shield className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm font-mono text-muted-foreground">No entities match your current filters.</p>
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="bg-card border border-border p-5 sticky top-6">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold font-mono">{selected.displayName}</h3>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{selected.name}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{selected.department} · {selected.location}</div>
                </div>
                {/* Tabs */}
                <div className="flex gap-1 border-b border-border">
                  {(["profile", "alerts"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className={cn("px-3 py-1.5 text-xs font-mono capitalize transition-all border-b-2 -mb-px",
                        tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                      )}>
                      {t}{t === "alerts" && entityAlerts.filter(a => !a.isAcknowledged).length > 0 &&
                        <span className="ml-1 text-destructive">({entityAlerts.filter(a => !a.isAcknowledged).length})</span>}
                    </button>
                  ))}
                </div>

                {tab === "profile" ? (
                  <>
                    {/* Risk score */}
                    <div className="text-center py-3 border border-border">
                      <div className={cn("text-4xl font-black font-mono", riskColor(selected.riskScore))}>{selected.riskScore}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">RISK SCORE <span className={cn("font-bold", trendColor(selected.riskTrend))}>{trendIcon(selected.riskTrend)}</span></div>
                      <div className="w-3/4 mx-auto bg-muted rounded-full h-1.5 mt-2">
                        <div className={cn("h-1.5 rounded-full", riskBg(selected.riskScore))} style={{ width: `${selected.riskScore}%` }} />
                      </div>
                    </div>
                    {/* Baseline vs recent */}
                    <div>
                      <div className="text-xs text-muted-foreground font-mono mb-2 tracking-wider">BASELINE vs RECENT</div>
                      <div className="space-y-2">
                        {[
                          ["Login Time", selected.baseline.loginTime, selected.recent.loginTime],
                          ["Data Access", selected.baseline.avgDataAccess, selected.recent.dataAccess],
                          ["Geography", selected.baseline.typicalGeo, selected.recent.geo],
                        ].map(([k, base, curr]) => (
                          <div key={String(k)} className="text-xs font-mono">
                            <div className="text-muted-foreground mb-0.5">{k}</div>
                            <div className="flex gap-2 items-center flex-wrap">
                              <span className="text-muted-foreground bg-muted/60 px-2 py-0.5 text-[10px]">{base}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className={cn("px-2 py-0.5 text-[10px]",
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
                        <div className="text-xs text-muted-foreground font-mono mb-2 tracking-wider">ANOMALY FLAGS</div>
                        <div className="space-y-1.5">
                          {selected.flags.map(f => (
                            <div key={f} className="flex items-start gap-2 text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1.5">
                              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />{f}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.flags.length === 0 && (
                      <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 flex items-center gap-2">
                        <Shield className="w-3 h-3" /> No anomaly flags detected
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    {entityAlerts.length === 0 ? (
                      <div className="text-xs text-muted-foreground font-mono text-center py-8">No alerts for this entity</div>
                    ) : entityAlerts.map(alert => (
                      <div key={alert.id} className={cn("border p-3 space-y-2", alert.isAcknowledged ? "border-border opacity-50" : sevColors[alert.severity])}>
                        <div className="flex items-start justify-between gap-2">
                          <Badge className={cn("text-[9px] font-mono border px-1.5 py-0 capitalize", sevColors[alert.severity])}>{alert.severity}</Badge>
                          {!alert.isAcknowledged && (
                            <button onClick={() => acknowledgeAlert(alert.id)}
                              className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">ACK</button>
                          )}
                        </div>
                        <p className="text-[10px] font-mono leading-relaxed">{alert.description}</p>
                        <div className="text-[9px] font-mono text-muted-foreground flex gap-3">
                          <span>Confidence: {alert.confidence}</span>
                          <span>{timeAgo(alert.triggeredAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
                <Eye className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground font-mono">Select an entity to view behavioral profile</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
