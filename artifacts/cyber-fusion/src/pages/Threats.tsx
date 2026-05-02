import { useState } from "react";
import { useListThreats, useCreateThreat, useUpdateThreat, useGetThreatsSummary, getListThreatsQueryKey, getGetThreatsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, PlusCircle, AlertTriangle, Shield, Eye, XCircle, Radio, Globe, Rss, Map, Signal } from "lucide-react";
import { cn } from "@/lib/utils";

const REFETCH_MS = 30_000;

const severityColor: Record<string, string> = {
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  high:     "text-accent border-accent/40 bg-accent/10",
  medium:   "text-primary border-primary/40 bg-primary/10",
  low:      "text-muted-foreground border-border",
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  active:     { icon: <AlertTriangle className="h-3 w-3" />, color: "text-destructive border-destructive/30 bg-destructive/10" },
  monitoring: { icon: <Eye          className="h-3 w-3" />, color: "text-accent border-accent/30 bg-accent/10"              },
  mitigated:  { icon: <Shield       className="h-3 w-3" />, color: "text-primary border-primary/30 bg-primary/10"           },
  closed:     { icon: <XCircle      className="h-3 w-3" />, color: "text-muted-foreground border-border"                    },
};

// ── IRONSIGHT-inspired OSINT feed ──────────────────────────────────────────
interface OsintItem {
  id: string;
  source: string;
  headline: string;
  region: string;
  category: "apt" | "vulnerability" | "campaign" | "incident" | "intel";
  severity: "critical" | "high" | "medium" | "low";
  age: string;
  url?: string;
}

const OSINT_FEED: OsintItem[] = [
  { id: "o1",  source: "NVD Feed",        headline: "CVE-2026-9001: Critical RCE in OpenSSL 3.x — CVSS 9.8, active exploitation observed",       region: "Global",        category: "vulnerability", severity: "critical", age: "12m" },
  { id: "o2",  source: "CISA KEV",        headline: "CISA adds 4 vulnerabilities to Known Exploited Vulnerabilities catalog — patch deadline 72h", region: "US Gov",        category: "vulnerability", severity: "critical", age: "1h"  },
  { id: "o3",  source: "MITRE ATT&CK",    headline: "APT41 (Winnti) — new sub-technique T1546.016 observed in East Asia telecom sector",           region: "East Asia",     category: "apt",           severity: "high",     age: "3h"  },
  { id: "o4",  source: "Telegram OSINT",  headline: "Pro-Iran group claims breach of Israeli critical infrastructure — unverified, monitoring",     region: "Middle East",   category: "incident",      severity: "high",     age: "2h"  },
  { id: "o5",  source: "Shadowserver",    headline: "47,000 devices running Ivanti Connect Secure still unpatched — mass scanning detected",        region: "Global",        category: "campaign",      severity: "high",     age: "4h"  },
  { id: "o6",  source: "CIRCL MISP",      headline: "New C2 infrastructure mapped: 14 IPs, 3 domains linked to Lazarus Group supply chain ops",    region: "North Korea",   category: "apt",           severity: "high",     age: "6h"  },
  { id: "o7",  source: "OSV Database",    headline: "lodash-utils@3.2.1 malicious payload exfiltrates env vars on import — remove immediately",    region: "Supply Chain",  category: "vulnerability", severity: "critical", age: "30m" },
  { id: "o8",  source: "GreyNoise",       headline: "Mass scanning campaign targeting port 9200 (Elasticsearch) — 2,300 unique source IPs",        region: "Global",        category: "campaign",      severity: "medium",   age: "8h"  },
  { id: "o9",  source: "Threat Intel WG", headline: "BlackCat/ALPHV ransomware updates encryption — now uses intermittent partial-file method",    region: "Global",        category: "campaign",      severity: "high",     age: "9h"  },
  { id: "o10", source: "DHS CISA",        headline: "Joint advisory: Chinese state actors targeting US water/energy SCADA — lateral movement TTPs", region: "US Critical",   category: "apt",           severity: "critical", age: "5h"  },
  { id: "o11", source: "AlienVault OTX",  headline: "New phishing kit mimics Microsoft 365 login — 340 domains registered this week",              region: "Global",        category: "campaign",      severity: "medium",   age: "11h" },
  { id: "o12", source: "Google TAG",      headline: "Hermit spyware variant targets Android 14 via zero-day in Pixel camera driver",                region: "Global",        category: "apt",           severity: "critical", age: "14h" },
];

// ── Country threat map data ──────────────────────────────────────────────────
const COUNTRY_THREATS = [
  { country: "US",      level: "HIGH",     actors: 12, campaigns: 8  },
  { country: "China",   level: "CRITICAL", actors: 24, campaigns: 19 },
  { country: "Russia",  level: "CRITICAL", actors: 31, campaigns: 22 },
  { country: "Iran",    level: "HIGH",     actors: 14, campaigns: 10 },
  { country: "DPRK",    level: "HIGH",     actors: 9,  campaigns: 7  },
  { country: "EU",      level: "MEDIUM",   actors: 5,  campaigns: 4  },
  { country: "Israel",  level: "HIGH",     actors: 8,  campaigns: 6  },
  { country: "Ukraine", level: "CRITICAL", actors: 18, campaigns: 15 },
];

const LEVEL_STYLE: Record<string, string> = {
  CRITICAL: "text-destructive border-destructive/40 bg-destructive/10",
  HIGH:     "text-accent border-accent/40 bg-accent/10",
  MEDIUM:   "text-primary border-primary/40 bg-primary/10",
  LOW:      "text-muted-foreground border-border",
};

const CAT_STYLE: Record<OsintItem["category"], string> = {
  apt:           "text-destructive border-destructive/30",
  vulnerability: "text-accent border-accent/30",
  campaign:      "text-primary border-primary/30",
  incident:      "text-destructive border-destructive/30",
  intel:         "text-muted-foreground border-border",
};

type Tab = "threats" | "osint" | "map";

export default function Threats() {
  const qc = useQueryClient();
  const [tab, setTab]                 = useState<Tab>("threats");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [osintFilter, setOsintFilter]       = useState<string>("");

  const { data: threats, isLoading } = useListThreats(
    severityFilter ? { severity: severityFilter as any } : {},
    { query: { queryKey: getListThreatsQueryKey(severityFilter ? { severity: severityFilter as any } : {}), refetchInterval: REFETCH_MS } }
  );
  const { data: summary } = useGetThreatsSummary({ query: { refetchInterval: REFETCH_MS } });

  const createThreat = useCreateThreat({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListThreatsQueryKey() }); qc.invalidateQueries({ queryKey: getGetThreatsSummaryQueryKey() }); setShowForm(false); setForm({ title: "", description: "", severity: "medium", category: "", source: "" }); } },
  });
  const updateThreat = useUpdateThreat({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListThreatsQueryKey() }); qc.invalidateQueries({ queryKey: getGetThreatsSummaryQueryKey() }); } },
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title: "", description: "", severity: "medium", category: "", source: "" });

  const handleCreate = (e: React.FormEvent) => { e.preventDefault(); createThreat.mutate({ data: form as any }); };
  const handleStatus = (id: number, status: string) => updateThreat.mutate({ id, data: { status: status as any } });

  const sorted = [...(threats ?? [])].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity as keyof typeof order] ?? 4) - (order[b.severity as keyof typeof order] ?? 4);
  });

  const filteredOsint = osintFilter ? OSINT_FEED.filter(f => f.category === osintFilter || f.severity === osintFilter) : OSINT_FEED;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // THREAT INTELLIGENCE</div>
          <h1 className="text-2xl font-bold tracking-wider">THREAT INTEL</h1>
        </div>
        <button
          onClick={() => { setTab("threats"); setShowForm(!showForm); }}
          className="flex items-center gap-2 border border-destructive px-4 py-2 text-sm font-mono text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <PlusCircle className="h-4 w-4" />LOG THREAT
        </button>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: "TOTAL",     value: summary.total                                        },
            { label: "CRITICAL",  value: summary.critical,  cls: "text-destructive cursor-pointer", filter: "critical" },
            { label: "HIGH",      value: summary.high,      cls: "text-accent cursor-pointer",      filter: "high"     },
            { label: "MEDIUM",    value: summary.medium,    cls: "text-primary cursor-pointer",     filter: "medium"   },
            { label: "LOW",       value: summary.low,       cls: "text-muted-foreground cursor-pointer", filter: "low" },
            { label: "ACTIVE",    value: summary.active,    cls: "text-destructive"                },
            { label: "MITIGATED", value: summary.mitigated, cls: "text-primary"                    },
          ].map(({ label, value, cls = "text-foreground", filter }) => (
            <div
              key={label}
              className={cn("bg-card border p-3 flex-1 min-w-16 transition-colors", severityFilter === filter ? "border-primary" : "border-border hover:border-muted-foreground", filter ? "cursor-pointer" : "")}
              onClick={() => filter && setSeverityFilter(severityFilter === filter ? "" : filter)}
            >
              <div className="text-xs font-mono text-muted-foreground">{label}</div>
              <div className={cn("text-2xl font-bold font-mono mt-1", cls)}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: "threats", label: "THREAT DATABASE", icon: ShieldAlert },
          { id: "osint",   label: "LIVE OSINT FEED",  icon: Rss         },
          { id: "map",     label: "GEO THREAT MAP",   icon: Map         },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id as Tab)} className={cn("flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-widest border-b-2 transition-colors", tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <Icon className="h-3.5 w-3.5" />{label}
            {id === "osint" && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse ml-0.5" />}
          </button>
        ))}
      </div>

      {/* ── THREAT DATABASE ── */}
      {tab === "threats" && (
        <div className="space-y-4">
          {severityFilter && (
            <div className="flex items-center gap-2 text-xs font-mono text-primary">
              FILTERING: {severityFilter.toUpperCase()}
              <button onClick={() => setSeverityFilter("")} className="text-muted-foreground hover:text-foreground ml-2">[CLEAR]</button>
            </div>
          )}

          {showForm && (
            <form onSubmit={handleCreate} className="bg-card border border-destructive p-5 space-y-4">
              <div className="text-xs font-mono text-destructive tracking-widest">LOG NEW THREAT</div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1">TITLE</label>
                  <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                    value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Threat name / CVE" required />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1">SEVERITY</label>
                  <select className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                    value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                    <option value="critical">CRITICAL</option><option value="high">HIGH</option><option value="medium">MEDIUM</option><option value="low">LOW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1">CATEGORY</label>
                  <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                    value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="CVE / Supply Chain / APT..." required />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1">SOURCE</label>
                  <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                    value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="NVD / Red Team / OSINT..." required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-muted-foreground mb-1">DESCRIPTION</label>
                  <textarea className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary resize-none"
                    rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Threat details..." required />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={createThreat.isPending} className="px-4 py-2 bg-destructive text-destructive-foreground text-sm font-mono hover:opacity-90 disabled:opacity-50">
                  {createThreat.isPending ? "LOGGING..." : "LOG THREAT"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border text-sm font-mono text-muted-foreground hover:text-foreground">CANCEL</button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="text-sm font-mono text-muted-foreground">SCANNING THREAT DATABASE...</div>
          ) : (
            <div className="space-y-2">
              {sorted.map(threat => {
                const sc = statusConfig[threat.status];
                return (
                  <div key={threat.id} className="bg-card border border-border p-4 space-y-3 hover:border-primary/30 transition-colors">
                    <div className="flex items-start gap-3 justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm">{threat.title}</span>
                            <span className={cn("text-xs font-mono border px-1.5 py-0.5", severityColor[threat.severity])}>{threat.severity.toUpperCase()}</span>
                            <span className="text-xs font-mono text-muted-foreground border border-border px-1.5 py-0.5">{threat.category}</span>
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{threat.description}</div>
                        </div>
                      </div>
                      <select className={cn("text-xs font-mono border px-2 py-1 bg-transparent focus:outline-none cursor-pointer shrink-0", sc.color)} value={threat.status} onChange={e => handleStatus(threat.id, e.target.value)}>
                        <option value="active">ACTIVE</option><option value="monitoring">MONITORING</option><option value="mitigated">MITIGATED</option><option value="closed">CLOSED</option>
                      </select>
                    </div>
                    <div className="flex gap-4 text-xs font-mono text-muted-foreground pl-7">
                      <span>SOURCE: <span className="text-foreground">{threat.source}</span></span>
                      <span>DETECTED: <span className="text-foreground">{new Date(threat.detectedAt).toLocaleDateString()}</span></span>
                    </div>
                  </div>
                );
              })}
              {sorted.length === 0 && (
                <div className="text-center py-12 font-mono text-sm text-muted-foreground">
                  <ShieldAlert className="h-8 w-8 mx-auto mb-3 opacity-30" />NO THREATS FOUND
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── LIVE OSINT FEED (IRONSIGHT) ── */}
      {tab === "osint" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-mono text-primary"><Signal className="h-3.5 w-3.5 animate-pulse" />LIVE FEED — {OSINT_FEED.length} SOURCES</span>
            <div className="flex gap-2 ml-auto flex-wrap">
              {["", "critical", "high", "apt", "vulnerability", "campaign"].map(f => (
                <button key={f} onClick={() => setOsintFilter(osintFilter === f ? "" : f)} className={cn("text-xs font-mono border px-2.5 py-1 transition-colors", osintFilter === f ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-muted-foreground")}>
                  {f ? f.toUpperCase() : "ALL"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredOsint.map(item => (
              <div key={item.id} className="bg-card border border-border p-3 flex items-start gap-3 hover:border-primary/30 transition-colors">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className={cn("text-xs font-mono border px-1.5 py-0.5", severityColor[item.severity])}>{item.severity.toUpperCase()}</span>
                  <span className="text-xs font-mono text-muted-foreground">{item.age}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1 leading-snug">{item.headline}</div>
                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Rss className="h-3 w-3" />{item.source}</span>
                    <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{item.region}</span>
                    <span className={cn("border px-1.5 py-0.5", CAT_STYLE[item.category])}>{item.category.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GEO THREAT MAP (IRONSIGHT) ── */}
      {tab === "map" && (
        <div className="space-y-4">
          <div className="text-xs font-mono text-muted-foreground">REGIONAL THREAT LEVELS — {COUNTRY_THREATS.length} REGIONS MONITORED</div>
          <div className="bg-card border border-border p-6">
            {/* Simple SVG world-sketch with threat nodes */}
            <svg viewBox="0 0 700 360" className="w-full h-56">
              {/* Continents (simplified shapes) */}
              <rect x="0" y="0" width="700" height="360" fill="hsl(var(--card))" />
              <text x="350" y="180" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="monospace" opacity="0.2">GLOBAL THREAT MAP</text>
              {/* Grid lines */}
              {[0,1,2,3,4,5,6].map(i => <line key={`h${i}`} x1="0" y1={i*60} x2="700" y2={i*60} stroke="hsl(var(--primary))" strokeOpacity="0.06" strokeWidth="1" />)}
              {[0,1,2,3,4,5,6,7,8,9].map(i => <line key={`v${i}`} x1={i*70} y1="0" x2={i*70} y2="360" stroke="hsl(var(--primary))" strokeOpacity="0.06" strokeWidth="1" />)}
              {/* Threat nodes */}
              {[
                { label: "US",      x: 160, y: 160, l: "CRITICAL" },
                { label: "RUSSIA",  x: 460, y: 100, l: "CRITICAL" },
                { label: "CHINA",   x: 560, y: 155, l: "CRITICAL" },
                { label: "UKRAINE", x: 410, y: 120, l: "CRITICAL" },
                { label: "IRAN",    x: 460, y: 175, l: "HIGH"     },
                { label: "DPRK",    x: 590, y: 135, l: "HIGH"     },
                { label: "EU",      x: 360, y: 120, l: "MEDIUM"   },
                { label: "ISRAEL",  x: 440, y: 190, l: "HIGH"     },
              ].map(n => {
                const col = n.l === "CRITICAL" ? "hsl(var(--destructive))" : n.l === "HIGH" ? "hsl(var(--accent))" : "hsl(var(--primary))";
                return (
                  <g key={n.label}>
                    <circle cx={n.x} cy={n.y} r="18" fill={col} fillOpacity="0.12" stroke={col} strokeWidth="1" />
                    <circle cx={n.x} cy={n.y} r="5"  fill={col} opacity="0.8" />
                    <text x={n.x} y={n.y + 28} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="8" fontFamily="monospace" opacity="0.9">{n.label}</text>
                  </g>
                );
              })}
            </svg>
            <div className="flex gap-6 mt-3 text-xs font-mono text-muted-foreground border-t border-border pt-3">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive/80" />Critical</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent/80" />High</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary/80" />Medium</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {COUNTRY_THREATS.map(c => (
              <div key={c.country} className="bg-card border border-border p-3 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">{c.country}</span>
                  <span className={cn("text-xs font-mono border px-1.5 py-0.5", LEVEL_STYLE[c.level])}>{c.level}</span>
                </div>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                  <div>ACTORS: <span className="text-foreground">{c.actors}</span></div>
                  <div>CAMPAIGNS: <span className="text-foreground">{c.campaigns}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
