import { useState } from "react";
import { useListMissions } from "@workspace/api-client-react";
import {
  Cpu, Activity, Clock, Radio, WifiOff, CheckCircle2, XCircle,
  Target, Play, Square, ChevronRight, Zap, Brain, Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusIcon: Record<string, React.ReactNode> = {
  active:  <Activity className="h-3 w-3 text-primary" />,
  idle:    <Clock    className="h-3 w-3 text-muted-foreground" />,
  standby: <Radio    className="h-3 w-3 text-accent" />,
  offline: <WifiOff  className="h-3 w-3 text-destructive" />,
};

const missionStatusIcon: Record<string, React.ReactNode> = {
  active:   <Activity     className="h-3 w-3 text-primary" />,
  pending:  <Clock        className="h-3 w-3 text-muted-foreground" />,
  complete: <CheckCircle2 className="h-3 w-3 text-primary" />,
  failed:   <XCircle      className="h-3 w-3 text-destructive" />,
};

const priorityColor: Record<string, string> = {
  critical: "text-destructive", high: "text-accent", medium: "text-primary", low: "text-muted-foreground",
};

const roleLabel: Record<string, string> = {
  architect:       "SWARM ARCHITECT",
  cto:             "CHIEF TECHNOLOGY OFFICER",
  product_manager: "PRODUCT MANAGER",
  security_lead:   "SECURITY LEAD",
  senior_engineer: "SENIOR ENGINEER",
  devops:          "DEVOPS ENGINEER",
  ui_ux:           "UI/UX DESIGNER",
  red_team:        "RED TEAM OPERATOR",
  documentation:   "DOCUMENTATION SPECIALIST",
};

// ── CAI-inspired agentic task runner ─────────────────────────────────────────
interface AgentTask {
  id: string;
  name: string;
  tool: string;
  status: "pending" | "running" | "complete" | "failed";
  output: string;
  duration?: number;
}

const TASK_TEMPLATES: Record<string, { name: string; tool: string; steps: string[] }[]> = {
  red_team: [
    { name: "Recon sweep",     tool: "ARGUS",    steps: ["DNS enum → 4 records", "Port scan → 6 open ports", "Tech fingerprint → Express + nginx", "Subdomains → staging.target.com EXPOSED ⚠"] },
    { name: "Vuln assessment", tool: "NUCLEI",   steps: ["Loading 2,847 templates...", "CVE-2026-8821 DETECTED — CRITICAL ⚠", "Open redirect → /auth/callback", ".git directory exposed ⚠", "2 critical, 3 high findings"] },
    { name: "AI analysis",     tool: "METATRON", steps: ["Mapping to MITRE ATT&CK...", "T1190 — Initial Access via RCE", "T1552.001 — Credentials via .git", "Kill chain: Recon → Access → Pivot", "Report generated"] },
  ],
  security_lead: [
    { name: "Threat triage",   tool: "AI ENGINE", steps: ["Loading threat context...", "4 critical threats detected", "Priority: CVE-2026-8821 (CVSS 9.8)", "Recommended: immediate patch", "Triage complete"] },
    { name: "IR coordination", tool: "SOAR",      steps: ["Checking playbook library...", "Playbook: P-003 matched", "Isolating affected hosts...", "Notification sent to team", "Containment active"] },
  ],
  senior_engineer: [
    { name: "Detection engineering", tool: "SIGMA",  steps: ["Generating detection rule...", "Rule: detect_cve_2026_8821.yml", "Testing against log sample...", "4 true positives, 0 false positives", "Rule deployed to SIEM"] },
    { name: "Log analysis",          tool: "CAI",    steps: ["Ingesting 50,000 log lines...", "Anomaly detected: 14:32:07 +00", "Lateral movement pattern found", "Source: 10.0.0.42", "IOC added to watchlist"] },
  ],
  architect: [
    { name: "Architecture review",  tool: "AI ENGINE", steps: ["Scanning service topology...", "6 microservices mapped", "Dependency vulnerabilities: 3", "Zero-trust gaps: 2 endpoints", "Remediation plan generated"] },
  ],
};

interface Agent {
  id: number;
  name: string;
  role: string;
  module: string;
  status: string;
  missionsCompleted: number;
  tasksActive: number;
  lastHeartbeat: string;
  createdAt: string;
}

interface Props {
  agent: Agent | null;
  onClose: () => void;
}

type SheetTab = "overview" | "agentic" | "missions";

export default function AgentDetailSheet({ agent, onClose }: Props) {
  const { data: allMissions } = useListMissions();
  const agentMissions = allMissions?.filter(m => m.assignedAgentId === agent?.id) ?? [];
  const [sheetTab, setSheetTab]   = useState<SheetTab>("overview");
  const [tasks, setTasks]         = useState<AgentTask[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loopActive, setLoopActive] = useState(false);
  const abortRef = { current: false };

  if (!agent) return null;

  const templates = TASK_TEMPLATES[agent.role] ?? TASK_TEMPLATES["senior_engineer"];

  const runAgenticLoop = async () => {
    if (isRunning) { abortRef.current = true; setIsRunning(false); setLoopActive(false); return; }
    abortRef.current = false;
    setIsRunning(true);
    setLoopActive(true);
    const taskList: AgentTask[] = templates.map((t, i) => ({ id: `t${i}`, name: t.name, tool: t.tool, status: "pending" as const, output: "" }));
    setTasks(taskList);

    for (let i = 0; i < templates.length; i++) {
      if (abortRef.current) break;
      const tmpl = templates[i];
      setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, status: "running" } : t));
      const start = Date.now();
      for (const step of tmpl.steps) {
        if (abortRef.current) break;
        await new Promise(r => setTimeout(r, 400 + Math.random() * 500));
        setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, output: t.output + (t.output ? "\n" : "") + step } : t));
      }
      const dur = ((Date.now() - start) / 1000).toFixed(1);
      const failed = tmpl.steps.some(s => s.includes("error") || s.includes("failed"));
      setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, status: failed ? "failed" : "complete", duration: parseFloat(dur) } : t));
    }
    setIsRunning(false);
    setLoopActive(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-card border-l border-border overflow-y-auto">

        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-primary/10 border border-primary/30">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold tracking-wider">{agent.name}</div>
                <div className="text-xs font-mono text-muted-foreground">{roleLabel[agent.role] ?? agent.role.toUpperCase()}</div>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs font-mono border border-border px-2 py-1">[CLOSE]</button>
          </div>
          <div className="flex items-center gap-2">
            {statusIcon[agent.status]}
            <span className="text-xs font-mono">{agent.status.toUpperCase()}</span>
            <span className="text-muted-foreground mx-1">·</span>
            <span className="text-xs text-muted-foreground">{agent.module}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold font-mono text-primary">{agent.missionsCompleted}</div>
            <div className="text-xs font-mono text-muted-foreground mt-1">COMPLETED</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold font-mono text-accent">{agent.tasksActive}</div>
            <div className="text-xs font-mono text-muted-foreground mt-1">ACTIVE</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold font-mono text-foreground">{agentMissions.length}</div>
            <div className="text-xs font-mono text-muted-foreground mt-1">ASSIGNED</div>
          </div>
        </div>

        {/* Sheet tabs */}
        <div className="flex border-b border-border">
          {(["overview", "agentic", "missions"] as SheetTab[]).map(t => (
            <button key={t} onClick={() => setSheetTab(t)} className={cn("flex-1 py-2 text-xs font-mono tracking-widest transition-colors border-b-2", sheetTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {sheetTab === "overview" && (
          <div className="p-6 space-y-3">
            <div className="text-xs font-mono text-muted-foreground tracking-widest mb-3">SYSTEM INFO</div>
            {[
              { label: "AGENT ID",       value: `#${agent.id}` },
              { label: "ROLE",           value: roleLabel[agent.role] ?? agent.role },
              { label: "MODULE",         value: agent.module },
              { label: "LAST HEARTBEAT", value: new Date(agent.lastHeartbeat).toLocaleString() },
              { label: "DEPLOYED",       value: new Date(agent.createdAt).toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-xs">
                <span className="font-mono text-muted-foreground">{label}</span>
                <span className="font-mono text-foreground">{value}</span>
              </div>
            ))}

            {/* Capabilities */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-xs font-mono text-muted-foreground tracking-widest mb-3">CAPABILITIES</div>
              <div className="flex flex-wrap gap-2">
                {(agent.role === "red_team" ? ["Recon","Port Scan","Vuln Scan","AI Analysis","Report Gen"] :
                  agent.role === "security_lead" ? ["Threat Triage","IR Coord","Playbook Exec","Team Notify"] :
                  agent.role === "senior_engineer" ? ["Detection Eng","Log Analysis","Rule Deploy","SIEM Integration"] :
                  ["Analysis","Planning","Coordination","Reporting"]).map(cap => (
                  <span key={cap} className="text-xs font-mono border border-border px-2 py-0.5 text-muted-foreground">{cap}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── AGENTIC LOOP (CAI) ── */}
        {sheetTab === "agentic" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono text-muted-foreground tracking-widest">AUTONOMOUS TASK LOOP</span>
              </div>
              <button
                onClick={runAgenticLoop}
                className={cn("flex items-center gap-1.5 text-xs font-mono border px-3 py-1.5 transition-colors", isRunning ? "border-destructive text-destructive hover:bg-destructive/10" : "border-primary text-primary hover:bg-primary/10")}
              >
                {isRunning ? <><Square className="h-3.5 w-3.5" />ABORT</> : <><Play className="h-3.5 w-3.5" />RUN LOOP</>}
              </button>
            </div>

            {loopActive && (
              <div className="flex items-center gap-2 text-xs font-mono text-primary bg-primary/5 border border-primary/20 px-3 py-2">
                <Zap className="h-3 w-3 animate-pulse" />
                AGENTIC LOOP ACTIVE — {agent.name} EXECUTING AUTONOMOUSLY
              </div>
            )}

            {tasks.length === 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-mono text-muted-foreground mb-2">CONFIGURED TASKS FOR {roleLabel[agent.role] ?? agent.role.toUpperCase()}</div>
                {templates.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border border-border text-xs font-mono">
                    <Terminal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <div className="text-foreground">{t.name}</div>
                      <div className="text-muted-foreground/70">{t.tool}</div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className={cn("border transition-all", task.status === "running" ? "border-primary bg-primary/5" : task.status === "complete" ? "border-primary/20" : task.status === "failed" ? "border-destructive/30" : "border-border")}>
                    <div className="flex items-center gap-2 p-3">
                      {task.status === "pending"  && <Clock        className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      {task.status === "running"  && <Activity     className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />}
                      {task.status === "complete" && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                      {task.status === "failed"   && <XCircle      className="h-3.5 w-3.5 text-destructive shrink-0" />}
                      <span className="text-xs font-mono flex-1">{task.name}</span>
                      <span className="text-xs font-mono text-muted-foreground/60">{task.tool}</span>
                      {task.duration && <span className="text-xs font-mono text-muted-foreground">{task.duration}s</span>}
                    </div>
                    {task.output && (
                      <div className="px-3 pb-3 border-t border-border/50 pt-2 space-y-0.5">
                        {task.output.split("\n").map((line, i) => (
                          <div key={i} className={cn("text-xs font-mono", line.includes("⚠") || line.includes("CRITICAL") || line.includes("EXPOSED") ? "text-destructive" : line.includes("DETECTED") ? "text-destructive" : "text-muted-foreground")}>
                            {line}
                          </div>
                        ))}
                        {task.status === "running" && <span className="text-primary animate-pulse">█</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MISSIONS ── */}
        {sheetTab === "missions" && (
          <div className="p-6">
            <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
              <Target className="h-3 w-3" />MISSION HISTORY ({agentMissions.length})
            </div>
            {agentMissions.length === 0 ? (
              <div className="text-sm font-mono text-muted-foreground">No missions assigned</div>
            ) : (
              <div className="space-y-2">
                {agentMissions.map(m => (
                  <div key={m.id} className="flex items-start gap-3 p-3 bg-background border border-border">
                    <div className="mt-0.5 shrink-0">{missionStatusIcon[m.status]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-xs font-mono", priorityColor[m.priority])}>{m.priority.toUpperCase()}</span>
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-xs font-mono text-muted-foreground">{m.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
