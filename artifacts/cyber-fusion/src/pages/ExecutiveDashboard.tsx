import { useState, useEffect, useCallback } from "react";
import { Shield, TrendingUp, TrendingDown, AlertTriangle, Clock, Download, Activity, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PERIODS = ["Last 7 Days", "Last 30 Days", "Last Quarter", "YTD"] as const;
type Period = typeof PERIODS[number];
const PERIOD_MAP: Record<Period, string> = { "Last 7 Days": "7d", "Last 30 Days": "30d", "Last Quarter": "90d", "YTD": "ytd" };

interface Summary {
  secScore: number;
  patchCompliance: number;
  mfaCoverage: number;
  mttdFormatted: string;
  mttrFormatted: string;
  threatsBlocked: number;
  activeThreats: number;
  criticalOpen: number;
  openIncidents: number;
  slaBreaches: number;
  totalIncidents: number;
  totalThreats: number;
}

interface RiskPosture { incidentTrend: number[]; threatTrend: number[] }
interface ThreatLandscape { total: number; bySeverity: Record<string,number>; byStatus: Record<string,number> }
interface ComplianceFramework { key: string; shortName: string; score: number; color: string }

const FRAMEWORK_COLORS: Record<string, string> = {
  nist_csf: "bg-cyan-500", iso_27001: "bg-violet-500", cis_controls: "bg-amber-500",
  soc2: "bg-emerald-500", hipaa: "bg-rose-500", cmmc: "bg-orange-500",
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100, h = 30;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GaugeRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 40, cx = 50, cy = 50;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />
        <text x="50" y="54" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold" fontFamily="monospace">{value}</text>
      </svg>
      <span className="text-[10px] text-muted-foreground font-mono text-center">{label}</span>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const { toast } = useToast();
  const [period, setPeriod]       = useState<Period>("Last 30 Days");
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [posture, setPosture]     = useState<RiskPosture | null>(null);
  const [landscape, setLandscape] = useState<ThreatLandscape | null>(null);
  const [compliance, setCompliance] = useState<ComplianceFramework[]>([]);
  const [loading, setLoading]     = useState(true);

  const fetchAll = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const [summRes, postureRes, landRes, compRes] = await Promise.all([
        fetch(`${BASE}/api/executive/summary?period=${PERIOD_MAP[p]}`,         { credentials: "include" }),
        fetch(`${BASE}/api/executive/risk-posture`,                             { credentials: "include" }),
        fetch(`${BASE}/api/executive/threat-landscape?period=${PERIOD_MAP[p]}`, { credentials: "include" }),
        fetch(`${BASE}/api/compliance/posture`,                                 { credentials: "include" }),
      ]);
      if (summRes.ok)    setSummary(await summRes.json());
      if (postureRes.ok) setPosture(await postureRes.json());
      if (landRes.ok)    setLandscape(await landRes.json());
      if (compRes.ok) {
        const d = await compRes.json();
        setCompliance((d.frameworks ?? []).map((f: any) => ({
          key: f.key, shortName: f.shortName, score: f.score,
          color: FRAMEWORK_COLORS[f.key] ?? "bg-primary",
        })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(period); }, [period, fetchAll]);

  function exportReport() {
    if (!summary) return;
    const lines = [
      `RAPID FORCE CYBER FUSION — EXECUTIVE SECURITY REPORT`,
      `Period: ${period}`,
      `Generated: ${new Date().toLocaleString()}`,
      ``,
      `OVERALL SECURITY POSTURE SCORE: ${summary.secScore}/100`,
      `PATCH COMPLIANCE: ${summary.patchCompliance}%`,
      `MFA COVERAGE: ${summary.mfaCoverage}%`,
      ``,
      `KEY METRICS`,
      `  Mean Time to Detect: ${summary.mttdFormatted}`,
      `  Mean Time to Respond: ${summary.mttrFormatted}`,
      `  Security Incidents: ${summary.totalIncidents}`,
      `  Threats Blocked: ${summary.threatsBlocked.toLocaleString()}`,
      `  SLA Breaches: ${summary.slaBreaches}`,
      `  Critical Open Items: ${summary.criticalOpen}`,
      ``,
      `COMPLIANCE POSTURE`,
      ...compliance.map(f => `  ${f.shortName}: ${f.score}%`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `executive-report-${period.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: "Report exported", description: `Executive security report for ${period} downloaded.` });
  }

  const kpi = summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-primary/70 tracking-widest mb-1">RAPID FORCE // EXECUTIVE DASHBOARD</div>
          <h1 className="text-2xl font-bold tracking-wider">EXECUTIVE DASHBOARD</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">Security posture summary · Board-ready metrics · Risk KPIs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-card border border-border p-1">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn("px-3 py-1 text-xs font-mono transition-all",
                  period === p ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}>{p}</button>
            ))}
          </div>
          <Button onClick={exportReport} disabled={!kpi} className="bg-card border border-border text-muted-foreground hover:bg-muted font-mono text-xs gap-2 h-8">
            <Download className="w-3.5 h-3.5" /> EXPORT REPORT
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground font-mono text-xs">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading executive metrics...
        </div>
      ) : kpi ? (
        <>
          {/* Security score banner */}
          <div className="bg-card border border-primary/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-primary/70 font-mono tracking-widest mb-1">OVERALL SECURITY POSTURE SCORE</div>
                <div className="flex items-end gap-3">
                  <span className="text-6xl font-black font-mono text-primary">{kpi.secScore}</span>
                  <span className="text-xl font-mono text-muted-foreground mb-2">/100</span>
                </div>
                <div className="w-64 bg-muted rounded-full h-2 mt-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${kpi.secScore}%` }} />
                </div>
              </div>
              <div className="flex gap-6">
                <GaugeRing value={kpi.patchCompliance} label="PATCH COMPLIANCE" color="hsl(var(--primary))" />
                <GaugeRing value={kpi.mfaCoverage} label="MFA COVERAGE" color="#a78bfa" />
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "MEAN TIME TO RESPOND", value: kpi.mttrFormatted,           icon: Clock,         color: "text-amber-400"   },
              { label: "SECURITY INCIDENTS",   value: kpi.totalIncidents,           icon: AlertTriangle, color: "text-destructive"  },
              { label: "THREATS BLOCKED",      value: kpi.threatsBlocked.toLocaleString(), icon: Shield, color: "text-primary"     },
              { label: "SLA BREACHES",         value: kpi.slaBreaches,              icon: Target, color: kpi.slaBreaches === 0 ? "text-emerald-400" : kpi.slaBreaches <= 3 ? "text-yellow-400" : "text-destructive" },
            ].map(stat => (
              <div key={stat.label} className="bg-card border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-mono tracking-wider leading-tight">{stat.label}</span>
                  <stat.icon className={cn("w-4 h-4 flex-shrink-0", stat.color)} />
                </div>
                <div className={cn("text-2xl font-bold font-mono", stat.color)}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Trend charts */}
          {posture && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-mono tracking-wider">INCIDENT VOLUME TREND (14 DAYS)</span>
                  <Activity className="w-4 h-4 text-red-400" />
                </div>
                <Sparkline data={posture.incidentTrend} color="#f87171" />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                  <span>14 days ago</span><span>Today</span>
                </div>
              </div>
              <div className="bg-card border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-mono tracking-wider">THREATS BLOCKED / DAY (14 DAYS)</span>
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <Sparkline data={posture.threatTrend} color="hsl(var(--primary))" />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                  <span>14 days ago</span><span>Today</span>
                </div>
              </div>
            </div>
          )}

          {/* Threat landscape + compliance */}
          <div className="grid grid-cols-3 gap-4">
            {landscape && (
              <div className="col-span-2 bg-card border border-border p-4">
                <div className="text-xs text-muted-foreground font-mono tracking-wider mb-4">THREAT LANDSCAPE — {period.toUpperCase()}</div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-mono text-muted-foreground mb-3 tracking-wider">BY SEVERITY</div>
                    <div className="space-y-3">
                      {[
                        { label: "Critical", count: landscape.bySeverity.critical ?? 0, color: "bg-red-500",     text: "text-red-400" },
                        { label: "High",     count: landscape.bySeverity.high ?? 0,     color: "bg-orange-500",  text: "text-orange-400" },
                        { label: "Medium",   count: landscape.bySeverity.medium ?? 0,   color: "bg-yellow-500",  text: "text-yellow-400" },
                        { label: "Low",      count: landscape.bySeverity.low ?? 0,      color: "bg-emerald-500", text: "text-emerald-400" },
                      ].map(row => {
                        const pct = landscape.total > 0 ? Math.round((row.count / landscape.total) * 100) : 0;
                        return (
                          <div key={row.label} className="flex items-center gap-3">
                            <span className={cn("text-xs font-mono w-16 flex-shrink-0", row.text)}>{row.label}</span>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div className={cn("h-2 rounded-full", row.color)} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground w-6 text-right">{row.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-muted-foreground mb-3 tracking-wider">BY STATUS</div>
                    <div className="space-y-3">
                      {[
                        { label: "Active",     count: landscape.byStatus.active ?? 0,    color: "bg-red-500",     text: "text-red-400" },
                        { label: "Monitoring", count: landscape.byStatus.monitoring ?? 0, color: "bg-amber-500",   text: "text-amber-400" },
                        { label: "Mitigated",  count: landscape.byStatus.mitigated ?? 0,  color: "bg-emerald-500", text: "text-emerald-400" },
                      ].map(row => {
                        const pct = landscape.total > 0 ? Math.round((row.count / landscape.total) * 100) : 0;
                        return (
                          <div key={row.label} className="flex items-center gap-3">
                            <span className={cn("text-xs font-mono w-20 flex-shrink-0", row.text)}>{row.label}</span>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div className={cn("h-2 rounded-full", row.color)} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground w-6 text-right">{row.count}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border text-xs font-mono">
                      <div className="flex justify-between text-muted-foreground mb-1"><span>Total threats</span><span className="text-foreground">{landscape.total}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>Open incidents</span><span className="text-foreground">{kpi.openIncidents}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {compliance.length > 0 && (
              <div className="bg-card border border-border p-4">
                <div className="text-xs text-muted-foreground font-mono tracking-wider mb-4">COMPLIANCE STATUS</div>
                <div className="space-y-2.5">
                  {compliance.slice(0, 6).map(f => (
                    <div key={f.key}>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-muted-foreground">{f.shortName}</span>
                        <span className="text-foreground">{f.score}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className={cn("h-1.5 rounded-full", f.color)} style={{ width: `${f.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Critical open items */}
          {kpi.criticalOpen > 0 && (
            <div className="bg-destructive/5 border border-destructive/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-xs font-mono text-destructive tracking-wider">{kpi.criticalOpen} CRITICAL OPEN ITEMS REQUIRE EXECUTIVE ATTENTION</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { title: "Active Critical Incidents", since: "ongoing", owner: "SOC Team" },
                  { title: `${kpi.criticalOpen} unresolved critical incident${kpi.criticalOpen > 1 ? "s" : ""}`, since: "this period", owner: "IR Lead" },
                ].slice(0, Math.min(kpi.criticalOpen, 2)).map(item => (
                  <div key={item.title} className="bg-destructive/10 border border-destructive/20 p-3">
                    <div className="text-xs font-mono text-destructive font-semibold">{item.title}</div>
                    <div className="flex gap-4 mt-1 text-[10px] font-mono text-destructive/70">
                      <span>{item.since}</span><span>Owner: {item.owner}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-muted-foreground font-mono text-xs">Failed to load executive metrics.</div>
      )}
    </div>
  );
}
