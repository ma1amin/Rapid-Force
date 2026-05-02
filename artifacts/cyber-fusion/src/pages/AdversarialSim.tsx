import { useState, useEffect, useRef } from "react";
import { Crosshair, Play, Square, Globe, Server, Wifi, Bug, Brain, FileText, Clock, Download, ZoomIn, ZoomOut, RotateCcw, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ScanPhase {
  id: string;
  name: string;
  tool: string;
  status: "pending" | "running" | "complete";
  findings: number;
  logs: string[];
}

interface Finding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  type: string;
  title: string;
  description: string;
  cve?: string;
  cvss?: number;
  technique?: string;
  port?: number;
  path?: string;
}

interface ScanRecord {
  id: string;
  target: string;
  startedAt: string;
  duration: number;
  findings: Finding[];
}

const PHASE_DEFS = [
  { id: "recon",    name: "RECON",      tool: "SUBDOMAIN DISCOVERY", icon: Globe   },
  { id: "portscan", name: "PORT SCAN",  tool: "PORT ENUMERATION",    icon: Server  },
  { id: "http",     name: "HTTP PROBE", tool: "SERVICE DETECTION",   icon: Wifi    },
  { id: "vulnscan", name: "VULN SCAN",  tool: "NUCLEI ENGINE",       icon: Bug     },
  { id: "ai",       name: "AI ANALYSIS",tool: "THREAT INTELLIGENCE", icon: Brain   },
];
const PHASE_DURATIONS = [2400, 2000, 1600, 3200, 2000];

const FINDING_POOL: Omit<Finding, "id">[] = [
  { severity: "critical", type: "RCE",      title: "Remote Code Execution via HTTP/2 Multiplexer",        description: "CVE-2026-8821: Active exploitation in wild via malformed HEADERS frame.",             cve: "CVE-2026-8821", cvss: 9.8, technique: "T1190",     port: 443  },
  { severity: "critical", type: "SQLI",     title: "SQL Injection — Unauthenticated Admin Panel",          description: "Time-based blind SQLi in login parameter allows full DB read.",                      cvss: 9.4,            technique: "T1190",     port: 8080, path: "/admin/login" },
  { severity: "critical", type: "CVE",      title: "Log4Shell — Unpatched Log4j 2.14 Detected",            description: "JNDI lookup via user-agent header triggers remote class loading.",                    cve: "CVE-2021-44228", cvss: 10.0, technique: "T1059.007", port: 8443 },
  { severity: "high",     type: "EXPOSURE", title: "Exposed .git Directory",                               description: "Full source repo accessible via /.git — includes credentials and internal paths.",  cvss: 7.5,            technique: "T1213",     path: "/.git/config"  },
  { severity: "high",     type: "MISCONFIG",title: "Open Redirect via Unvalidated Parameter",              description: "?next= accepts arbitrary URLs, enabling phishing chain.",                            cvss: 6.1,            technique: "T1566.002", path: "/auth/callback" },
  { severity: "high",     type: "SSL",      title: "TLS 1.0 / 1.1 Still Accepted",                        description: "Legacy TLS enabled — susceptible to BEAST/POODLE downgrade attacks.",               cvss: 5.9,            technique: "T1040",     port: 443  },
  { severity: "medium",   type: "MISCONFIG",title: "CORS Policy Allows Arbitrary Origins",                 description: "Access-Control-Allow-Origin: * with credentials enabled on API endpoints.",          cvss: 6.5,            technique: "T1557",     port: 443, path: "/api"   },
  { severity: "medium",   type: "INFO_LEAK",title: "Server Version Disclosed in Response Headers",         description: "X-Powered-By: Express 4.18.2 — enables targeted version exploits.",                 cvss: 5.3,            technique: "T1592",     port: 80   },
  { severity: "low",      type: "HEADER",   title: "Missing Security Headers",                             description: "X-Frame-Options, X-Content-Type-Options, and CSP headers absent.",                  cvss: 3.7,            technique: "T1185",     port: 80   },
  { severity: "low",      type: "INFO",     title: "Directory Listing Enabled",                            description: "/static/ directory contents enumerable without authentication.",                     cvss: 3.1,            technique: "T1083",     path: "/static/"      },
  { severity: "info",     type: "TECH",     title: "Technology Stack Identified",                          description: "Detected: React 18.2, Express 4.18, nginx 1.24, PostgreSQL 15.",                    technique: "T1592.002" },
  { severity: "info",     type: "SUBDOMAIN",title: "Attack Surface: 4 Subdomains Discovered",              description: "api, staging, dev, admin — 4 additional entry points mapped.",                      technique: "T1590.001" },
];

function generateFindings(target: string): Finding[] {
  const seed = target.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const count = 4 + (seed % 5);
  const shuffled = [...FINDING_POOL].sort((a, b) =>
    ((seed * 2654435761 + a.title.length * 7) % 100) - ((seed * 2654435761 + b.title.length * 13) % 100)
  );
  return shuffled.slice(0, count).map((f, i) => ({ ...f, id: `f${i}` }));
}

function phaseLogs(phaseId: string, target: string): string[] {
  const d = target || "target.com";
  const map: Record<string, string[]> = {
    recon:    [`[*] Initializing subdomain enumeration for ${d}`, `[+] Found: api.${d} → 93.184.216.40`, `[+] Found: staging.${d} → 10.0.0.15 (internal)`, `[+] Found: dev.${d} → 10.0.0.20 (internal)`, `[+] Found: admin.${d} → 93.184.216.60`, `[*] WHOIS: Registrar NameCheap · Cloudflare NS`, `[*] DNS: 3 A, 1 MX, 2 TXT, 2 NS records`, `[+] 4 subdomains discovered — 2 internal IPs leaked`],
    portscan: [`[*] SYN scan on ${d}`, `[+] 22/tcp   OPEN  ssh        OpenSSH 8.9`, `[+] 80/tcp   OPEN  http       nginx 1.24`, `[+] 443/tcp  OPEN  https      nginx 1.24`, `[+] 3000/tcp OPEN  http-alt   Express`, `[!] 5432/tcp OPEN  postgresql — INTERNET EXPOSED`, `[+] 8080/tcp OPEN  http-proxy AdminPanel`, `[!] Database exposed on public interface`],
    http:     [`[*] Probing HTTP services...`, `[+] ${d}:80  → HTTP 301 → https`, `[+] ${d}:443 → HTTP 200 React App`, `[+] ${d}:8080→ HTTP 200 Admin Panel`, `[+] Server: nginx/1.24.0`, `[+] X-Powered-By: Express 4.18.2`, `[!] Content-Security-Policy: MISSING`, `[+] Screenshots captured for 3 services`],
    vulnscan: [`[*] Loading 2,847 nuclei templates`, `[*] Scanning ${d} — all templates`, `[!] CVE-2026-8821: HTTP/2 RCE — CRITICAL`, `[!] .git directory exposed — HIGH`, `[!] Open redirect in /auth/callback — HIGH`, `[+] TLS 1.0 enabled — MEDIUM`, `[+] CORS wildcard misconfiguration — MEDIUM`, `[+] Scan complete`],
    ai:       [`[*] Correlating with MITRE ATT&CK framework`, `[*] Mapping attack vectors to kill chain`, `[+] Initial Access: T1190 — Exploit public-facing app`, `[+] Lateral Movement: T1021 via exposed PostgreSQL`, `[+] Credential Access: T1213 via .git exposure`, `[+] Exfiltration risk: CRITICAL via SQLi chain`, `[*] Generating adversarial kill chain...`, `[+] AI report ready`],
  };
  return map[phaseId] ?? [];
}

function buildReport(target: string, findings: Finding[]): string {
  const crit = findings.filter(f => f.severity === "critical").length;
  const high = findings.filter(f => f.severity === "high").length;
  const cves = findings.filter(f => f.cve).map(f => f.cve).join(", ") || "None";
  const risk = crit > 0 ? "CRITICAL" : high > 0 ? "HIGH" : "MEDIUM";
  return [
    `## Adversarial Assessment — ${target}`,
    `**Overall Risk: ${risk}** · ${findings.length} findings (${crit} critical, ${high} high)`,
    `**CVEs Identified:** ${cves}`,
    ``,
    `### Kill Chain Analysis`,
    `- **Initial Access** \`T1190\` — HTTP/2 RCE + SQLi on exposed admin panel`,
    `- **Discovery** \`T1592\` — Version headers, tech fingerprinting`,
    `- **Credential Access** \`T1213\` — Source code via /.git exposure`,
    `- **Lateral Movement** \`T1021\` — Exposed PostgreSQL on public interface`,
    `- **Exfiltration** \`T1048\` — Data dump via blind SQLi`,
    ``,
    `### Critical Findings`,
    ...findings
      .filter(f => f.severity === "critical" || f.severity === "high")
      .map(f => `- **[${f.severity.toUpperCase()}]** ${f.title}${f.cve ? ` · \`${f.cve}\` CVSS ${f.cvss}` : f.cvss ? ` · CVSS ${f.cvss}` : ""} \`${f.technique}\``),
    ``,
    `### Immediate Remediation`,
    `1. Patch CVE-2026-8821 — update HTTP/2 library immediately`,
    `2. Remove /.git from web root or add WAF rule to block access`,
    `3. Restrict PostgreSQL to internal network — deny 0.0.0.0/0:5432`,
    `4. Disable TLS 1.0/1.1 — enforce TLS 1.2+ with HSTS preload`,
    `5. Implement strict CORS policy — whitelist known origins only`,
  ].join("\n");
}

const SEV_STYLE: Record<string, string> = {
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  high:     "text-accent border-accent/40 bg-accent/10",
  medium:   "text-primary border-primary/40 bg-primary/10",
  low:      "text-muted-foreground border-border",
  info:     "text-muted-foreground border-border/50 bg-muted/20",
};

type Tab = "scanner" | "graph" | "report" | "history";

const GRAPH_NODES = [
  { id: "atk",   label: "ATTACKER",      type: "red",    x: 60,  y: 180 },
  { id: "net",   label: "INTERNET",      type: "gray",   x: 200, y: 180 },
  { id: "web",   label: "WEB APP",       type: "cyan",   x: 360, y: 90  },
  { id: "api",   label: "API SERVER",    type: "cyan",   x: 360, y: 180 },
  { id: "db",    label: "DATABASE",      type: "cyan",   x: 360, y: 270 },
  { id: "git",   label: ".GIT REPO",     type: "red",    x: 530, y: 90  },
  { id: "admin", label: "ADMIN PANEL",   type: "red",    x: 530, y: 180 },
  { id: "data",  label: "SENSITIVE DATA",type: "orange", x: 530, y: 270 },
];
const GRAPH_EDGES = [
  { from: "atk",  to: "net",   label: "RECON"        },
  { from: "net",  to: "web",   label: "HTTP/2 RCE"   },
  { from: "net",  to: "api",   label: "SQLI"         },
  { from: "net",  to: "db",    label: "EXPOSED 5432" },
  { from: "web",  to: "git",   label: ".git leak"    },
  { from: "api",  to: "admin", label: "auth bypass"  },
  { from: "db",   to: "data",  label: "dump"         },
];
const NODE_STROKE: Record<string, string> = {
  red: "hsl(var(--destructive))", cyan: "hsl(var(--primary))", gray: "hsl(var(--muted-foreground))", orange: "hsl(var(--accent))",
};

const LS_KEY = "rf-adversarial-history";

function loadHistory(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(h: ScanRecord[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(h.slice(0, 20)));
  } catch {}
}

export default function AdversarialSim() {
  const { toast } = useToast();
  const [tab, setTab]               = useState<Tab>("scanner");
  const [target, setTarget]         = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [phases, setPhases]         = useState<ScanPhase[]>(
    PHASE_DEFS.map(p => ({ ...p, status: "pending" as const, findings: 0, logs: [] }))
  );
  const [findings, setFindings]     = useState<Finding[]>([]);
  const [history, setHistory]       = useState<ScanRecord[]>(loadHistory);
  const [logLines, setLogLines]     = useState<string[]>([]);
  const [report, setReport]         = useState("");
  const [zoom, setZoom]             = useState(1.0);
  const logRef   = useRef<HTMLDivElement>(null);
  const graphRef = useRef<SVGSVGElement>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  const startScan = async () => {
    if (!target.trim() || isScanning) return;
    abortRef.current = false;
    setIsScanning(true);
    setFindings([]);
    setReport("");
    setLogLines([`[*] Targeting ${target}`, `[*] Loading scan modules...`]);
    setPhases(PHASE_DEFS.map(p => ({ ...p, status: "pending" as const, findings: 0, logs: [] })));

    const genFindings = generateFindings(target);
    const start = Date.now();

    for (let i = 0; i < PHASE_DEFS.length; i++) {
      if (abortRef.current) break;
      const phase = PHASE_DEFS[i];
      const dur   = PHASE_DURATIONS[i];
      const logs  = phaseLogs(phase.id, target);

      setPhases(prev => prev.map((p, idx) => idx === i ? { ...p, status: "running" } : p));
      for (const log of logs) {
        if (abortRef.current) break;
        await new Promise(r => setTimeout(r, dur / logs.length));
        setLogLines(prev => [...prev, log]);
      }
      const phaseFindings = i === 3 ? genFindings.length : 0;
      setPhases(prev => prev.map((p, idx) => idx === i ? { ...p, status: "complete", findings: phaseFindings, logs } : p));
      if (i === 3) setFindings(genFindings);
      if (i === 4) setReport(buildReport(target, genFindings));
    }

    if (!abortRef.current) {
      const dur = (Date.now() - start) / 1000;
      const newRecord: ScanRecord = { id: `s${Date.now()}`, target, startedAt: new Date().toISOString(), duration: dur, findings: genFindings };
      setHistory(prev => {
        const updated = [newRecord, ...prev.slice(0, 19)];
        saveHistory(updated);
        return updated;
      });
      setLogLines(prev => [...prev, `[+] Scan complete — ${genFindings.length} findings in ${dur.toFixed(1)}s`]);
    }
    setIsScanning(false);
  };

  const stopScan = () => { abortRef.current = true; setIsScanning(false); };

  function exportGraphPng() {
    const svg = graphRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 620 * 2;
      canvas.height = 360 * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(2, 2);
      ctx.fillStyle = "hsl(210, 45%, 7%)";
      ctx.fillRect(0, 0, 620, 360);
      ctx.drawImage(img, 0, 0, 620, 360);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `attack-graph-${target || "scan"}-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast({ title: "Graph exported", description: "Attack graph saved as PNG." });
      }, "image/png");
    };
    img.src = url;
  }

  function exportReport() {
    if (!report) return;
    const blob = new Blob([report], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `adversarial-report-${target || "scan"}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: "Report exported", description: "Assessment report downloaded." });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // OFFENSIVE SECURITY</div>
          <h1 className="text-2xl font-bold tracking-wider">ADVERSARIAL SIMULATION</h1>
        </div>
        <span className={cn("text-xs font-mono flex items-center gap-1.5 border px-3 py-1.5", isScanning ? "text-accent border-accent/40 bg-accent/10" : "text-muted-foreground border-border")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", isScanning ? "bg-accent animate-ping" : "bg-muted-foreground")} />
          {isScanning ? "SCAN ACTIVE" : "READY"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["scanner", "graph", "report", "history"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("px-4 py-2 text-xs font-mono tracking-widest border-b-2 transition-colors", tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.toUpperCase()}
            {t === "history" && history.length > 0 && (
              <span className="ml-1.5 text-muted-foreground">{history.length}</span>
            )}
            {t === "scanner" && findings.length > 0 && (
              <span className="ml-2 text-destructive">{findings.filter(f => f.severity === "critical" || f.severity === "high").length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── SCANNER ── */}
      {tab === "scanner" && (
        <div className="space-y-5">
          <div className="bg-card border border-border p-4 flex items-center gap-3">
            <Crosshair className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm font-mono focus:outline-none placeholder:text-muted-foreground/50"
              placeholder="TARGET: domain.com  or  192.168.1.0/24"
              value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === "Enter" && startScan()}
              disabled={isScanning}
            />
            <button
              onClick={isScanning ? stopScan : startScan}
              disabled={!target.trim() && !isScanning}
              className={cn("flex items-center gap-2 px-4 py-2 text-xs font-mono border transition-colors disabled:opacity-40", isScanning ? "border-destructive text-destructive hover:bg-destructive/10" : "border-primary text-primary hover:bg-primary hover:text-primary-foreground")}
            >
              {isScanning ? <><Square className="h-3.5 w-3.5" />ABORT</> : <><Play className="h-3.5 w-3.5" />INITIATE SCAN</>}
            </button>
          </div>

          {/* Phase pipeline */}
          <div className="grid grid-cols-5 gap-2">
            {phases.map((phase, idx) => {
              const Icon = PHASE_DEFS[idx].icon;
              return (
                <div key={phase.id} className={cn("border p-3 transition-all", phase.status === "running" ? "border-primary bg-primary/5 animate-pulse" : phase.status === "complete" ? "border-primary/30 bg-primary/5" : "border-border")}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className={cn("h-3.5 w-3.5", phase.status === "running" ? "text-primary" : phase.status === "complete" ? "text-primary/60" : "text-muted-foreground")} />
                    <span className="text-xs font-mono font-bold">{phase.name}</span>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground text-[10px]">{PHASE_DEFS[idx].tool}</div>
                  <div className="mt-2 text-xs font-mono">
                    {phase.status === "pending"  && <span className="text-muted-foreground/50">PENDING</span>}
                    {phase.status === "running"  && <span className="text-primary">RUNNING...</span>}
                    {phase.status === "complete" && <span className={phase.findings > 0 ? "text-destructive" : "text-primary"}>{phase.findings > 0 ? `${phase.findings} FINDINGS` : "COMPLETE"}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Log terminal */}
          {logLines.length > 0 && (
            <div ref={logRef} className="bg-black/50 border border-border p-4 h-40 overflow-y-auto font-mono text-xs space-y-0.5">
              {logLines.map((line, i) => (
                <div key={i} className={cn(line.startsWith("[!]") ? "text-destructive" : line.startsWith("[+]") ? "text-primary" : "text-muted-foreground")}>
                  {line}
                </div>
              ))}
              {isScanning && <span className="text-primary animate-pulse">█</span>}
            </div>
          )}

          {/* Findings */}
          {findings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground tracking-widest">
                <span>FINDINGS — {findings.length} TOTAL</span>
                <div className="flex gap-3">
                  {(["critical","high","medium","low"] as const).map(s => {
                    const c = findings.filter(f => f.severity === s).length;
                    return c > 0 ? <span key={s} className={SEV_STYLE[s].split(" ")[0]}>{c} {s.toUpperCase()}</span> : null;
                  })}
                </div>
              </div>
              {findings.map(f => (
                <div key={f.id} className="bg-card border border-border p-3 flex items-start gap-3 hover:border-primary/30 transition-colors">
                  <span className={cn("text-xs font-mono border px-1.5 py-0.5 shrink-0", SEV_STYLE[f.severity])}>{f.severity.toUpperCase()}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{f.title}</span>
                      {f.cve && <span className="text-xs font-mono text-accent">{f.cve}</span>}
                      {f.technique && <span className="text-xs font-mono text-muted-foreground border border-border px-1">{f.technique}</span>}
                      {f.path && <span className="text-xs font-mono text-muted-foreground">{f.path}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{f.description}</div>
                  </div>
                  {f.cvss && (
                    <span className="text-xs font-mono font-bold shrink-0" style={{ color: f.cvss >= 9 ? "hsl(var(--destructive))" : f.cvss >= 7 ? "hsl(var(--accent))" : "hsl(var(--primary))" }}>
                      {f.cvss}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {findings.length === 0 && !isScanning && logLines.length === 0 && (
            <div className="text-center py-16 text-muted-foreground font-mono text-sm">
              <Crosshair className="h-10 w-10 mx-auto mb-3 opacity-20" />
              ENTER TARGET AND INITIATE SCAN
            </div>
          )}
        </div>
      )}

      {/* ── ATTACK GRAPH ── */}
      {tab === "graph" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-muted-foreground">ATTACK GRAPH — {target || "NO SCAN RUN"}</div>
            {findings.length > 0 && (
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))}
                  className="border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors p-1.5">
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-mono text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                  className="border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors p-1.5">
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setZoom(1.0)}
                  className="border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors p-1.5" title="Reset zoom">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button onClick={exportGraphPng}
                  className="flex items-center gap-1.5 border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors px-2.5 py-1.5 text-xs font-mono">
                  <Image className="h-3.5 w-3.5" />EXPORT PNG
                </button>
              </div>
            )}
          </div>
          {findings.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground font-mono text-sm">
              <Bug className="h-10 w-10 mx-auto mb-3 opacity-20" />RUN A SCAN TO GENERATE ATTACK GRAPH
            </div>
          ) : (
            <div className="bg-card border border-border p-4 overflow-hidden">
              <div style={{ overflow: "auto" }}>
                <svg
                  ref={graphRef}
                  viewBox="0 0 620 360"
                  width={620 * zoom}
                  height={360 * zoom}
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ display: "block" }}
                >
                  <rect width="620" height="360" fill="hsl(210, 45%, 7%)" />
                  {GRAPH_EDGES.map((e, i) => {
                    const f = GRAPH_NODES.find(n => n.id === e.from)!;
                    const t = GRAPH_NODES.find(n => n.id === e.to)!;
                    return (
                      <g key={i}>
                        <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="hsl(var(--primary))" strokeWidth="1" strokeOpacity="0.35" strokeDasharray="4 3" />
                        <text x={(f.x + t.x) / 2} y={(f.y + t.y) / 2 - 5} fill="hsl(var(--muted-foreground))" fontSize="7" textAnchor="middle" fontFamily="monospace">{e.label}</text>
                      </g>
                    );
                  })}
                  {GRAPH_NODES.map(n => (
                    <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                      <rect x="-44" y="-15" width="88" height="30" rx="2" fill="hsl(var(--card))" stroke={NODE_STROKE[n.type]} strokeWidth="1.2" strokeOpacity="0.7" />
                      <text fill="hsl(var(--foreground))" fontSize="8" textAnchor="middle" dy="4" fontFamily="monospace" fontWeight="bold">{n.label}</text>
                    </g>
                  ))}
                </svg>
              </div>
              <div className="flex gap-5 mt-3 text-xs font-mono text-muted-foreground border-t border-border pt-3">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 border border-destructive/70" />Attacker</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 border border-primary/70" />Target Service</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 border border-destructive/50" />Exposure</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 border border-accent/70" />Critical Asset</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AI REPORT ── */}
      {tab === "report" && (
        <div>
          {!report ? (
            <div className="text-center py-16 text-muted-foreground font-mono text-sm">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />RUN A SCAN TO GENERATE AI REPORT
            </div>
          ) : (
            <div className="bg-card border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-mono text-muted-foreground tracking-widest">AI-GENERATED ASSESSMENT REPORT</div>
                <button onClick={exportReport} className="flex items-center gap-1.5 text-xs font-mono text-primary border border-primary/30 px-3 py-1.5 hover:bg-primary/10 transition-colors">
                  <Download className="h-3.5 w-3.5" />EXPORT
                </button>
              </div>
              <div className="space-y-1 font-mono text-sm">
                {report.split("\n").map((line, i) => (
                  <div key={i} className={cn(
                    line.startsWith("## ")  ? "text-primary font-bold text-base mt-4 mb-1" :
                    line.startsWith("### ") ? "text-foreground font-bold mt-3 mb-1" :
                    line.startsWith("**Overall Risk: CRITICAL") ? "text-destructive font-bold" :
                    line.startsWith("**Overall Risk: HIGH")     ? "text-accent font-bold" :
                    line.startsWith("- **[CRITICAL]") ? "text-destructive" :
                    line.startsWith("- **[HIGH]")     ? "text-accent" :
                    line.match(/^\d\./)  ? "text-foreground" :
                    line.startsWith("-") ? "text-foreground/80 pl-2" :
                    "text-foreground/70"
                  )}>{line}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab === "history" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground font-mono text-sm">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />NO SCAN HISTORY
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>{history.length} SAVED SCANS — persisted across sessions</span>
                <button onClick={() => { setHistory([]); saveHistory([]); }}
                  className="text-destructive/60 hover:text-destructive transition-colors">CLEAR ALL</button>
              </div>
              {history.map(scan => {
                const crit = scan.findings.filter(f => f.severity === "critical").length;
                const high = scan.findings.filter(f => f.severity === "high").length;
                return (
                  <div key={scan.id} className="bg-card border border-border p-4 hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => { setTarget(scan.target); setFindings(scan.findings); setReport(buildReport(scan.target, scan.findings)); setTab("scanner"); }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-mono font-bold">{scan.target}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {new Date(scan.startedAt).toLocaleString()} · {scan.duration.toFixed(1)}s
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs font-mono">
                      <span className="text-muted-foreground">{scan.findings.length} findings</span>
                      {crit > 0 && <span className="text-destructive">{crit} critical</span>}
                      {high > 0 && <span className="text-accent">{high} high</span>}
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
