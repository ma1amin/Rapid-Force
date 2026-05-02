import { useState, useEffect } from "react";
import { Search, Play, Square, Globe, Server, Code2, Lock, Network, Shield, MapPin, ListTree, Plus, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReconModule {
  id: string;
  name: string;
  description: string;
  category: "passive" | "active";
  icon: React.ComponentType<{ className?: string }>;
}

interface ModuleResult {
  moduleId: string;
  status: "pending" | "running" | "complete" | "error";
  output: string[];
  issues: number;
}

interface Hypothesis {
  id: string;
  title: string;
  technique: string;
  tactic: string;
  confidence: number;
  status: "open" | "investigating" | "confirmed" | "disproven";
  created: Date;
}

interface ScanHistoryEntry {
  id: string;
  target: string;
  completedAt: string;
  modules: string[];
  results: { moduleId: string; issues: number; outputPreview: string }[];
}

const MODULES: ReconModule[] = [
  { id: "dns",        name: "DNS LOOKUP",       description: "A, MX, NS, TXT, SOA records",      category: "passive", icon: Globe    },
  { id: "whois",      name: "WHOIS",             description: "Domain registration & ownership",  category: "passive", icon: ListTree },
  { id: "portscan",   name: "PORT SCAN",         description: "TCP SYN scan, common ports",       category: "active",  icon: Server   },
  { id: "headers",    name: "HTTP HEADERS",      description: "Server, security headers, cookies",category: "passive", icon: Code2    },
  { id: "ssl",        name: "SSL/TLS",           description: "Certificate chain, expiry, SANs",  category: "passive", icon: Lock     },
  { id: "subdomains", name: "SUBDOMAIN ENUM",    description: "Passive subdomain discovery",      category: "passive", icon: Network  },
  { id: "tech",       name: "TECH FINGERPRINT",  description: "CMS, frameworks, libraries",       category: "passive", icon: Shield   },
  { id: "geo",        name: "GEO / ASN",         description: "IP geolocation and ASN lookup",    category: "passive", icon: MapPin   },
];

const MODULE_OUTPUT: Record<string, (t: string) => string[]> = {
  dns:        t => [`; ${t}`, `${t}.   IN  A      93.184.216.34`, `${t}.   IN  A      93.184.216.35`, `mail.${t}. IN MX  10  mail.${t}.`, `${t}.   IN  NS     ns1.cloudflare.com.`, `${t}.   IN  TXT    "v=spf1 include:_spf.google.com ~all"`, `; 2 A, 1 MX, 2 NS, 1 TXT`],
  whois:      t => [`Domain: ${t.toUpperCase()}`, `Registrar: NameCheap, Inc.`, `Created: 2019-03-14`, `Updated: 2024-11-01`, `Expires: 2026-03-14`, `NS: NS1.CLOUDFLARE.COM`, `NS: NS2.CLOUDFLARE.COM`, `DNSSEC: unsigned`],
  portscan:   t => [`SYN scan → ${t}`, `PORT     STATE  SERVICE  VERSION`, `22/tcp   open   ssh      OpenSSH 8.9`, `80/tcp   open   http     nginx 1.24`, `443/tcp  open   https    nginx 1.24`, `3000/tcp open   node.js  Express 4`, `5432/tcp OPEN   postgres — EXPOSED ⚠`, `8080/tcp open   http-alt AdminPanel`],
  headers:    t => [`GET / HTTP/1.1 → ${t}`, `HTTP/2 200`, `Server: nginx/1.24.0`, `X-Powered-By: Express`, `Content-Security-Policy: MISSING ⚠`, `X-Frame-Options: MISSING ⚠`, `Strict-Transport-Security: max-age=31536000`, `Set-Cookie: session=...; HttpOnly; Secure`],
  ssl:        t => [`Certificate: ${t}`, `Issuer: Let's Encrypt Authority X3`, `Valid: 2026-01-15 → 2026-04-15 (74 days)`, `SANs: ${t}, www.${t}, api.${t}`, `Key: RSA 2048-bit`, `TLS 1.0: ENABLED ⚠`, `TLS 1.2: yes`, `TLS 1.3: yes`],
  subdomains: t => [`Passive enum: ${t}`, `[+] api.${t}      → 93.184.216.40`, `[+] www.${t}      → 93.184.216.34`, `[+] mail.${t}     → 93.184.216.50`, `[+] staging.${t}  → 10.0.0.15 (internal) ⚠`, `[+] dev.${t}      → 10.0.0.20 (internal) ⚠`, `[+] admin.${t}    → 93.184.216.60`, `6 subdomains — 2 internal IPs leaked ⚠`],
  tech:       t => [`Fingerprint: ${t}`, `[WEB]    React 18.2.0`, `[WEB]    Tailwind CSS 3.4`, `[SERVER] Express 4.18.2 (Node.js 20)`, `[INFRA]  nginx 1.24 (reverse proxy)`, `[DB]     PostgreSQL (port 5432 EXPOSED) ⚠`, `[CDN]    Cloudflare (WAF enabled)`, `[TRACK]  Google Analytics 4`],
  geo:        t => [`IP: 93.184.216.34`, `Hostname: ${t}`, `City: Norwell, MA`, `Country: United States (US)`, `ASN: AS15133 (Edgecast)`, `ISP: Verizon Digital Media`, `Type: Hosting / CDN`, `Blacklisted: NO`],
};

const DEFAULT_HYPOTHESES: Hypothesis[] = [
  { id: "h1", title: "Lateral movement via exposed PostgreSQL port 5432",     technique: "T1021.007", tactic: "Lateral Movement",   confidence: 78, status: "investigating", created: new Date(Date.now() - 3_600_000) },
  { id: "h2", title: "Credential harvesting via .git repository exposure",    technique: "T1552.001", tactic: "Credential Access",  confidence: 91, status: "confirmed",     created: new Date(Date.now() - 7_200_000) },
  { id: "h3", title: "Persistence via scheduled task planted during RCE",     technique: "T1053.005", tactic: "Persistence",        confidence: 45, status: "open",          created: new Date(Date.now() - 1_800_000) },
  { id: "h4", title: "Exfiltration via DNS tunneling to C2 infrastructure",   technique: "T1048.003", tactic: "Exfiltration",       confidence: 35, status: "open",          created: new Date(Date.now() - 900_000)   },
  { id: "h5", title: "Supply chain compromise via malicious npm dependency",  technique: "T1195.002", tactic: "Initial Access",     confidence: 62, status: "investigating", created: new Date(Date.now() - 5_400_000) },
];

const SAVED_QUERIES = [
  { id: "q1", name: "Exposed Database Ports",          query: 'port:5432 OR port:3306 OR port:27017 country:"US"',                   category: "exposure",  hits: 142 },
  { id: "q2", name: "Log4Shell Vulnerable Servers",    query: 'http.component:"Apache Log4j" version:2.0-2.14.1',                   category: "cve",       hits: 34  },
  { id: "q3", name: "Default Credentials — Admin",     query: 'http.title:"Admin" http.status:200 default_password:true',           category: "misconfig", hits: 89  },
  { id: "q4", name: "Exposed .git Repositories",       query: 'http.content:".git" NOT title:"GitHub"',                             category: "exposure",  hits: 267 },
  { id: "q5", name: "Misconfigured S3 Buckets",        query: '"ListBucketResult" http.status:200',                                  category: "misconfig", hits: 51  },
  { id: "q6", name: "Open Kubernetes API Server",      query: 'http.title:"Kubernetes" port:6443 OR port:8080 http.status:200',     category: "exposure",  hits: 23  },
  { id: "q7", name: "Exposed Grafana Instances",       query: 'http.title:"Grafana" http.status:200 NOT http.status:401',           category: "exposure",  hits: 187 },
];

const STATUS_STYLE: Record<Hypothesis["status"], string> = {
  open:          "text-muted-foreground border-border",
  investigating: "text-primary border-primary/40 bg-primary/10",
  confirmed:     "text-destructive border-destructive/40 bg-destructive/10",
  disproven:     "text-muted-foreground border-border opacity-50",
};
const STATUS_CYCLE: Hypothesis["status"][] = ["open", "investigating", "confirmed", "disproven"];

type Tab = "workbench" | "hypotheses" | "queries" | "history";

const LS_KEY = "rf-hunting-history";

function loadScanHistory(): ScanHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveScanHistory(h: ScanHistoryEntry[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(h.slice(0, 30)));
  } catch {}
}

export default function ThreatHunting() {
  const [tab, setTab]                   = useState<Tab>("workbench");
  const [target, setTarget]             = useState("");
  const [selected, setSelected]         = useState<Set<string>>(new Set(["dns", "portscan", "subdomains", "tech"]));
  const [isRunning, setIsRunning]       = useState(false);
  const [results, setResults]           = useState<Map<string, ModuleResult>>(new Map());
  const [hypotheses, setHypotheses]     = useState<Hypothesis[]>(DEFAULT_HYPOTHESES);
  const [showHypForm, setShowHypForm]   = useState(false);
  const [hypTitle, setHypTitle]         = useState("");
  const [hypTech, setHypTech]           = useState("");
  const [scanHistory, setScanHistory]   = useState<ScanHistoryEntry[]>(loadScanHistory);
  const abortRef = { current: false };

  const toggleMod = (id: string) => {
    if (isRunning) return;
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const runRecon = async () => {
    if (!target.trim() || isRunning || selected.size === 0) return;
    abortRef.current = false;
    setIsRunning(true);
    const ids = Array.from(selected);
    setResults(new Map(ids.map(id => [id, { moduleId: id, status: "pending" as const, output: [], issues: 0 }])));
    const completedResults: { moduleId: string; issues: number; outputPreview: string }[] = [];

    for (const id of ids) {
      if (abortRef.current) break;
      setResults(prev => new Map(prev).set(id, { moduleId: id, status: "running", output: [], issues: 0 }));
      await new Promise(r => setTimeout(r, 700 + Math.random() * 1100));
      const output = MODULE_OUTPUT[id]?.(target) ?? [`[*] ${id} complete`];
      const issues = output.filter(l => l.includes("⚠") || l.includes("EXPOSED") || l.includes("MISSING")).length;
      setResults(prev => new Map(prev).set(id, { moduleId: id, status: "complete", output, issues }));
      completedResults.push({ moduleId: id, issues, outputPreview: output[0] ?? "" });
    }

    if (!abortRef.current && completedResults.length > 0) {
      const entry: ScanHistoryEntry = {
        id: `hunt-${Date.now()}`,
        target,
        completedAt: new Date().toISOString(),
        modules: completedResults.map(r => r.moduleId),
        results: completedResults,
      };
      setScanHistory(prev => {
        const updated = [entry, ...prev.slice(0, 29)];
        saveScanHistory(updated);
        return updated;
      });
    }
    setIsRunning(false);
  };

  const addHyp = () => {
    if (!hypTitle.trim()) return;
    setHypotheses(prev => [...prev, { id: `h${Date.now()}`, title: hypTitle, technique: hypTech || "T????", tactic: "Unknown", confidence: 50, status: "open", created: new Date() }]);
    setHypTitle(""); setHypTech(""); setShowHypForm(false);
  };

  const cycleHyp = (id: string) => {
    setHypotheses(prev => prev.map(h => h.id !== id ? h : { ...h, status: STATUS_CYCLE[(STATUS_CYCLE.indexOf(h.status) + 1) % STATUS_CYCLE.length] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // THREAT HUNTING</div>
          <h1 className="text-2xl font-bold tracking-wider">THREAT HUNTING</h1>
        </div>
        <div className="flex gap-3 text-xs font-mono">
          <span className="border border-destructive/40 text-destructive px-3 py-1.5">{hypotheses.filter(h => h.status === "confirmed").length} CONFIRMED</span>
          <span className="border border-border text-muted-foreground px-3 py-1.5">{hypotheses.filter(h => h.status === "open").length} OPEN</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["workbench", "hypotheses", "queries", "history"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("px-4 py-2 text-xs font-mono tracking-widest border-b-2 transition-colors", tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.toUpperCase()}
            {t === "history" && scanHistory.length > 0 && (
              <span className="ml-1.5 text-muted-foreground">{scanHistory.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── WORKBENCH ── */}
      {tab === "workbench" && (
        <div className="space-y-5">
          <div className="bg-card border border-border p-4 flex items-center gap-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm font-mono focus:outline-none placeholder:text-muted-foreground/50"
              placeholder="TARGET: domain.com  /  IP address  /  CIDR range"
              value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runRecon()}
              disabled={isRunning}
            />
            <button
              onClick={isRunning ? () => { abortRef.current = true; setIsRunning(false); } : runRecon}
              disabled={!target.trim() && !isRunning}
              className={cn("flex items-center gap-2 px-4 py-2 text-xs font-mono border transition-colors disabled:opacity-40", isRunning ? "border-destructive text-destructive hover:bg-destructive/10" : "border-primary text-primary hover:bg-primary hover:text-primary-foreground")}
            >
              {isRunning ? <><Square className="h-3.5 w-3.5" />STOP</> : <><Play className="h-3.5 w-3.5" />RUN RECON</>}
            </button>
          </div>

          {/* Module grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MODULES.map(mod => {
              const Icon = mod.icon;
              const res = results.get(mod.id);
              const isOn = selected.has(mod.id);
              return (
                <button key={mod.id} onClick={() => toggleMod(mod.id)} className={cn("border p-3 text-left transition-all", isOn ? "border-primary bg-primary/5" : "border-border hover:border-border/80", res?.status === "running" ? "animate-pulse" : "")}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", isOn ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-xs font-mono font-bold">{mod.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{mod.description}</div>
                  <div className="mt-1.5 text-xs font-mono">
                    {!res                     && <span className={cn("px-1 border text-[10px]", isOn ? "text-primary/60 border-primary/20" : "text-muted-foreground/40 border-border/40")}>{mod.category.toUpperCase()}</span>}
                    {res?.status === "running"  && <span className="text-primary">RUNNING...</span>}
                    {res?.status === "complete" && <span className={res.issues > 0 ? "text-destructive" : "text-primary"}>{res.issues > 0 ? `${res.issues} ISSUES ⚠` : "CLEAN"}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Results */}
          {results.size > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-muted-foreground tracking-widest">MODULE RESULTS</div>
              {Array.from(results.entries()).map(([id, res]) => {
                const mod = MODULES.find(m => m.id === id)!;
                const Icon = mod.icon;
                return (
                  <div key={id} className="bg-card border border-border">
                    <div className="flex items-center gap-2 p-3 border-b border-border/50">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-mono font-bold">{mod.name}</span>
                      <div className="ml-auto">
                        {res.status === "running"  && <span className="text-xs font-mono text-primary animate-pulse">RUNNING</span>}
                        {res.status === "complete" && res.issues > 0 && <span className="text-xs font-mono text-destructive">{res.issues} ISSUES</span>}
                        {res.status === "complete" && res.issues === 0 && <span className="text-xs font-mono text-primary">CLEAN</span>}
                      </div>
                    </div>
                    {res.output.length > 0 && (
                      <div className="p-3 bg-black/20 font-mono text-xs space-y-0.5">
                        {res.output.map((line, i) => (
                          <div key={i} className={cn(line.includes("⚠") || line.includes("EXPOSED") || line.includes("MISSING") ? "text-destructive" : line.startsWith("[+]") ? "text-primary" : line.startsWith("[*]") ? "text-muted-foreground" : "text-foreground/70")}>
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {results.size === 0 && (
            <div className="text-center py-16 text-muted-foreground font-mono text-sm">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
              SELECT MODULES · ENTER TARGET · RUN RECON
            </div>
          )}
        </div>
      )}

      {/* ── HYPOTHESES ── */}
      {tab === "hypotheses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-muted-foreground">HUNT HYPOTHESES — {hypotheses.length} TOTAL</div>
            <button onClick={() => setShowHypForm(v => !v)} className="flex items-center gap-1.5 text-xs font-mono text-primary border border-primary/30 px-3 py-1.5 hover:bg-primary/10 transition-colors">
              <Plus className="h-3.5 w-3.5" />NEW HYPOTHESIS
            </button>
          </div>

          {showHypForm && (
            <div className="bg-card border border-primary p-4 space-y-3">
              <div className="text-xs font-mono text-primary tracking-widest">NEW HUNT HYPOTHESIS</div>
              <div className="flex gap-3">
                <input className="flex-1 bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" placeholder="Hypothesis description..." value={hypTitle} onChange={e => setHypTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && addHyp()} />
                <input className="w-32 bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" placeholder="T1234.001" value={hypTech} onChange={e => setHypTech(e.target.value)} />
                <button onClick={addHyp} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-mono hover:opacity-90">ADD</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {hypotheses.map(h => (
              <div key={h.id} className="bg-card border border-border p-4 flex items-center gap-4 hover:border-primary/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1">{h.title}</div>
                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                    <span className="text-accent">{h.technique}</span>
                    <span>{h.tactic}</span>
                    <span>Confidence: <span className={h.confidence >= 70 ? "text-destructive" : h.confidence >= 50 ? "text-accent" : "text-muted-foreground"}>{h.confidence}%</span></span>
                    <span>{h.created.toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {h.status === "confirmed"  && <CheckCircle2 className="h-4 w-4 text-destructive" />}
                  {h.status === "disproven"  && <XCircle className="h-4 w-4 text-muted-foreground" />}
                  <button onClick={() => cycleHyp(h.id)} className={cn("text-xs font-mono border px-2.5 py-1 transition-colors", STATUS_STYLE[h.status])}>
                    {h.status.toUpperCase()}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── QUERIES ── */}
      {tab === "queries" && (
        <div className="space-y-3">
          <div className="text-xs font-mono text-muted-foreground tracking-widest">SAVED HUNT QUERIES — {SAVED_QUERIES.length}</div>
          {SAVED_QUERIES.map(q => (
            <div key={q.id} className="bg-card border border-border p-4 flex items-center gap-4 hover:border-primary/30 transition-colors cursor-pointer">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{q.name}</span>
                  <span className="text-xs font-mono border border-border px-1.5 py-0.5 text-muted-foreground">{q.category.toUpperCase()}</span>
                </div>
                <div className="text-xs font-mono text-muted-foreground/80 bg-background/50 px-2 py-1 truncate">{q.query}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono text-primary font-bold">{q.hits}</div>
                <div className="text-xs font-mono text-muted-foreground">HITS</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab === "history" && (
        <div className="space-y-3">
          {scanHistory.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground font-mono text-sm">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
              NO RECON HISTORY — scans are saved automatically
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>{scanHistory.length} SAVED RECON RUNS — persisted across sessions</span>
                <button onClick={() => { setScanHistory([]); saveScanHistory([]); }}
                  className="text-destructive/60 hover:text-destructive transition-colors">CLEAR ALL</button>
              </div>
              {scanHistory.map(entry => {
                const totalIssues = entry.results.reduce((s, r) => s + r.issues, 0);
                return (
                  <div key={entry.id} className="bg-card border border-border p-4 hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => { setTarget(entry.target); setTab("workbench"); }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-mono font-bold">{entry.target}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {new Date(entry.completedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                      <span>{entry.modules.length} modules</span>
                      {totalIssues > 0
                        ? <span className="text-destructive">{totalIssues} issues found</span>
                        : <span className="text-primary">All clean</span>
                      }
                      <span>{entry.modules.slice(0, 4).join(", ")}{entry.modules.length > 4 ? ` +${entry.modules.length - 4}` : ""}</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
