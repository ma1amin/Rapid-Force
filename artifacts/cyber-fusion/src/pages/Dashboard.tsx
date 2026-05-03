import {
  useGetAgentsSummary, useListSprints, useGetThreatsSummary,
  useListActivity, useListMissions, useListIncidents, useGetIncidentsSummary,
  useListDetections,
  getListActivityQueryKey, getListMissionsQueryKey,
  getListIncidentsQueryKey, getGetIncidentsSummaryQueryKey,
} from "@workspace/api-client-react";
import {
  Cpu, ShieldAlert, Target, Zap, Activity, CheckCircle2, Clock,
  XCircle, AlertTriangle, Siren, FileCode2, TrendingUp, TrendingDown,
} from "lucide-react";
import AgentStatusChart   from "@/components/charts/AgentStatusChart";
import ThreatSeverityChart from "@/components/charts/ThreatSeverityChart";
import MissionStatusChart  from "@/components/charts/MissionStatusChart";
import { cn } from "@/lib/utils";

const REFETCH_MS = 30_000;

function StatCard({ label, value, sub, accent = false, warn = false, danger = false, icon: Icon }: {
  label: string; value: string | number; sub?: string;
  accent?: boolean; warn?: boolean; danger?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const color = danger ? "text-destructive" : warn ? "text-accent" : accent ? "text-primary" : "text-foreground";
  return (
    <div className="bg-card border border-border p-4 flex flex-col gap-2 min-w-28 flex-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground tracking-widest">{label}</span>
        {Icon && <Icon className={cn("h-3.5 w-3.5", color, "opacity-60")} />}
      </div>
      <span className={cn("text-3xl font-bold font-mono", color)}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

const eventTypeColor: Record<string, string> = {
  threat_detected:     "text-destructive",
  mission_complete:    "text-primary",
  sprint_started:      "text-accent",
  sprint_complete:     "text-primary",
  agent_activated:     "text-primary",
  mission_created:     "text-muted-foreground",
  mission_updated:     "text-muted-foreground",
  threat_mitigated:    "text-primary",
  agent_status_change: "text-muted-foreground",
  sprint_planning:     "text-accent",
};

const missionStatusIcon: Record<string, React.ReactNode> = {
  active:   <Activity    className="h-3 w-3 text-primary"         />,
  pending:  <Clock       className="h-3 w-3 text-muted-foreground"/>,
  complete: <CheckCircle2 className="h-3 w-3 text-primary"       />,
  failed:   <XCircle     className="h-3 w-3 text-destructive"    />,
};

const priorityColor: Record<string, string> = {
  critical: "text-destructive",
  high:     "text-accent",
  medium:   "text-primary",
  low:      "text-muted-foreground",
};

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function SocHealthBar({ score }: { score: number }) {
  const label = score >= 80 ? "GOOD" : score >= 60 ? "MODERATE" : score >= 40 ? "ELEVATED RISK" : "CRITICAL";
  const color  = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-primary" : score >= 40 ? "bg-amber-500" : "bg-destructive";
  const text   = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-primary" : score >= 40 ? "text-amber-400" : "text-destructive";
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-muted-foreground">SOC HEALTH SCORE</span>
          <span className={cn("text-xs font-mono font-bold", text)}>{label}</span>
        </div>
        <div className="h-2 bg-muted w-full">
          <div className={cn("h-full transition-all duration-700", color)} style={{ width: `${score}%` }} />
        </div>
      </div>
      <span className={cn("text-3xl font-black font-mono tabular-nums shrink-0", text)}>{score}</span>
    </div>
  );
}

export default function Dashboard() {
  const { data: agentsSummary }    = useGetAgentsSummary({}, { query: { queryKey: ["agents-summary"], refetchInterval: REFETCH_MS } });
  const { data: sprints }          = useListSprints({},       { query: { queryKey: ["sprints"],       refetchInterval: REFETCH_MS } });
  const { data: threatsSummary }   = useGetThreatsSummary(    { query: { refetchInterval: REFETCH_MS } });
  const { data: incidentsSummary } = useGetIncidentsSummary({ query: { queryKey: getGetIncidentsSummaryQueryKey(), refetchInterval: REFETCH_MS } });
  const { data: activity }         = useListActivity(
    { limit: 10 },
    { query: { queryKey: getListActivityQueryKey({ limit: 10 }), refetchInterval: REFETCH_MS } }
  );
  const { data: missions } = useListMissions(
    {},
    { query: { queryKey: getListMissionsQueryKey({}), refetchInterval: REFETCH_MS } }
  );
  const { data: incidents } = useListIncidents(
    {},
    { query: { queryKey: getListIncidentsQueryKey({}), refetchInterval: REFETCH_MS } }
  );
  const { data: detections } = useListDetections(
    {},
    { query: { queryKey: ["detections"], refetchInterval: REFETCH_MS } }
  );

  const activeSprint    = sprints?.find(s => s.status === "active");
  const criticalMissions = missions?.filter(m => m.priority === "critical" && m.status !== "complete") ?? [];
  const openIncidents   = incidents?.filter(i => i.status === "open" || i.status === "investigating") ?? [];
  const criticalInc     = incidents?.filter(i => i.severity === "critical" && i.status !== "closed") ?? [];

  // Compute SOC Health Score
  const criticalActive = (threatsSummary?.critical ?? 0) + (threatsSummary?.high ?? 0) / 2;
  const openIncCount   = openIncidents.length;
  const agentUptime    = agentsSummary && agentsSummary.total > 0
    ? (agentsSummary.active / agentsSummary.total) * 100 : 80;
  const mitRate        = threatsSummary && threatsSummary.total > 0
    ? (threatsSummary.mitigated / threatsSummary.total) * 100 : 70;
  const rawScore = Math.round(
    Math.max(0, Math.min(100,
      (mitRate * 0.35) + (agentUptime * 0.25) + (100 - Math.min(100, criticalActive * 8) * 0.25) - (openIncCount * 3)
    ))
  );
  const healthScore = isNaN(rawScore) ? 72 : Math.max(10, rawScore);

  const now = new Date();
  const datePart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const timePart = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const missionCounts = {
    active:   missions?.filter(m => m.status === "active").length   ?? 0,
    pending:  missions?.filter(m => m.status === "pending").length  ?? 0,
    complete: missions?.filter(m => m.status === "complete").length ?? 0,
    failed:   missions?.filter(m => m.status === "failed").length   ?? 0,
  };

  const activeDetections = detections?.filter(d => d.status === "active").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE CYBER FUSION // COMMAND CENTER</div>
          <h1 className="text-2xl font-bold tracking-wider">OPERATIONS OVERVIEW</h1>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-muted-foreground">SYSTEM TIME</div>
          <div className="text-xs font-mono text-primary">{datePart} {timePart} ({tz})</div>
          <div className="text-xs font-mono text-muted-foreground/50 mt-0.5">AUTO-REFRESH 30s</div>
        </div>
      </div>

      {/* SOC Health Score banner */}
      <div className={cn("border p-4 space-y-3",
        healthScore < 40 ? "border-destructive/40 bg-destructive/5" :
        healthScore < 60 ? "border-amber-500/30 bg-amber-500/5" :
        "border-border bg-card")}>
        <SocHealthBar score={healthScore} />
        {criticalInc.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-mono text-destructive border-t border-border pt-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {criticalInc.length} CRITICAL INCIDENT{criticalInc.length > 1 ? "S" : ""} ACTIVE: {criticalInc.slice(0,2).map(i => i.title).join(", ")}
            {criticalInc.length > 2 && ` +${criticalInc.length - 2} more`}
          </div>
        )}
      </div>

      {/* Key metrics — threats */}
      <div>
        <div className="text-xs font-mono text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
          <ShieldAlert className="h-3 w-3" /> THREAT POSTURE
        </div>
        <div className="flex flex-wrap gap-3">
          <StatCard label="TOTAL THREATS"  value={threatsSummary?.total    ?? "—"} icon={ShieldAlert} />
          <StatCard label="CRITICAL"        value={threatsSummary?.critical  ?? "—"} danger icon={AlertTriangle} />
          <StatCard label="HIGH"            value={threatsSummary?.high      ?? "—"} warn />
          <StatCard label="ACTIVE"          value={threatsSummary?.active    ?? "—"} warn icon={Activity} />
          <StatCard label="MITIGATED"       value={threatsSummary?.mitigated ?? "—"} accent icon={CheckCircle2} />
          <StatCard label="ACTIVE RULES"    value={activeDetections}                  accent sub="detection engine" icon={FileCode2} />
        </div>
      </div>

      {/* Incident + Agent row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Incident status */}
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
            <Siren className="h-3 w-3" /> INCIDENT STATUS
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "OPEN",          value: incidentsSummary?.open          ?? 0, danger: true },
              { label: "INVESTIGATING", value: incidentsSummary?.investigating  ?? 0, warn: true  },
              { label: "CONTAINED",     value: incidentsSummary?.contained      ?? 0, accent: true },
              { label: "ERADICATED",    value: incidentsSummary?.eradicated     ?? 0 },
              { label: "CLOSED",        value: incidentsSummary?.closed         ?? 0 },
              { label: "TOTAL",         value: incidentsSummary?.total          ?? 0 },
            ].map(({ label, value, danger, warn, accent }) => (
              <div key={label} className="bg-card border border-border p-3 text-center">
                <div className={cn("text-xl font-bold font-mono", danger ? "text-destructive" : warn ? "text-accent" : accent ? "text-primary" : "text-foreground")}>
                  {value}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent fleet */}
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
            <Cpu className="h-3 w-3" /> AGENT FLEET
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "TOTAL",        value: agentsSummary?.total   ?? "—" },
              { label: "ACTIVE",       value: agentsSummary?.active  ?? "—", accent: true },
              { label: "IDLE",         value: agentsSummary?.idle    ?? "—" },
              { label: "STANDBY",      value: agentsSummary?.standby ?? "—", warn: true },
              { label: "OFFLINE",      value: agentsSummary?.offline ?? "—", danger: true },
              { label: "MISSIONS",     value: agentsSummary?.totalMissionsCompleted ?? "—", accent: true },
            ].map(({ label, value, accent, warn, danger }) => (
              <div key={label} className="bg-card border border-border p-3 text-center">
                <div className={cn("text-xl font-bold font-mono", danger ? "text-destructive" : warn ? "text-accent" : accent ? "text-primary" : "text-foreground")}>
                  {value}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-2 flex items-center gap-2">
            <Cpu className="h-3 w-3" /> AGENT UTILIZATION
          </div>
          {agentsSummary
            ? <AgentStatusChart active={agentsSummary.active} idle={agentsSummary.idle} standby={agentsSummary.standby} offline={agentsSummary.offline} />
            : <div className="h-44 flex items-center justify-center text-xs font-mono text-muted-foreground">LOADING...</div>}
        </div>
        <div className="bg-card border border-border p-4">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-2 flex items-center gap-2">
            <ShieldAlert className="h-3 w-3" /> THREAT SEVERITY
          </div>
          {threatsSummary
            ? <ThreatSeverityChart critical={threatsSummary.critical} high={threatsSummary.high} medium={threatsSummary.medium} low={threatsSummary.low} />
            : <div className="h-44 flex items-center justify-center text-xs font-mono text-muted-foreground">LOADING...</div>}
        </div>
        <div className="bg-card border border-border p-4">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-2 flex items-center gap-2">
            <Target className="h-3 w-3" /> MISSION STATUS
          </div>
          <MissionStatusChart active={missionCounts.active} pending={missionCounts.pending} complete={missionCounts.complete} failed={missionCounts.failed} />
        </div>
      </div>

      {/* Sprint + Threat summary */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border p-5">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
            <Zap className="h-3 w-3" /> ACTIVE SPRINT
          </div>
          {activeSprint ? (
            <div className="space-y-4">
              <div>
                <div className="text-lg font-bold tracking-wide">{activeSprint.name}</div>
                <div className="text-sm text-muted-foreground mt-1">{activeSprint.objective}</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">PROGRESS</span>
                  <span className="text-primary">{activeSprint.progress}%</span>
                </div>
                <div className="w-full h-2 bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${activeSprint.progress}%` }} />
                </div>
              </div>
              <div className="flex gap-6 text-xs font-mono text-muted-foreground">
                <span>START: <span className="text-foreground">{activeSprint.startDate}</span></span>
                <span>END: <span className="text-foreground">{activeSprint.endDate}</span></span>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm font-mono">No active sprint</div>
          )}
        </div>

        <div className="bg-card border border-border p-5">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
            <ShieldAlert className="h-3 w-3" /> THREAT SUMMARY
          </div>
          {threatsSummary ? (
            <div className="space-y-3">
              {[
                { label: "Critical + High threats",       value: threatsSummary.critical + threatsSummary.high, color: "text-destructive", trend: "up"   },
                { label: "Active (not mitigated)",         value: threatsSummary.active,                        color: "text-accent",      trend: "flat" },
                { label: "Mitigated this period",          value: threatsSummary.mitigated,                     color: "text-primary",     trend: "down" },
                { label: "Monitoring (low/medium)",        value: threatsSummary.medium + threatsSummary.low,   color: "text-muted-foreground", trend: "flat" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <span className="text-xs font-mono text-muted-foreground flex-1">{row.label}</span>
                  <div className="flex items-center gap-1.5">
                    {row.trend === "up"   && <TrendingUp   className="h-3 w-3 text-destructive" />}
                    {row.trend === "down" && <TrendingDown className="h-3 w-3 text-primary"     />}
                    <span className={cn("text-lg font-bold font-mono", row.color)}>{row.value}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-muted-foreground text-sm font-mono">Loading...</div>}
        </div>
      </div>

      {/* Open Incidents + Activity */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border p-5">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
            <Siren className="h-3 w-3" /> OPEN INCIDENTS
          </div>
          <div className="space-y-2">
            {openIncidents.length === 0 ? (
              <div className="text-sm text-muted-foreground font-mono py-4 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-primary opacity-60" />No open incidents
              </div>
            ) : (
              openIncidents.slice(0, 6).map(inc => (
                <div key={inc.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className={cn("text-xs font-mono border px-1.5 py-0.5 shrink-0",
                    inc.severity === "critical" ? "text-destructive border-destructive/40 bg-destructive/10" :
                    inc.severity === "high"     ? "text-accent border-accent/40 bg-accent/10" :
                    "text-primary border-primary/40 bg-primary/10"
                  )}>{inc.severity?.toUpperCase()}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{inc.title}</div>
                    <div className="text-xs font-mono text-muted-foreground">{inc.type?.replace("_"," ").toUpperCase()} / {inc.status?.toUpperCase()}</div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{timeAgo(inc.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border border-border p-5">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp className="h-3 w-3" /> RECENT ACTIVITY
          </div>
          <div className="space-y-2">
            {activity?.slice(0, 8).map(evt => (
              <div key={evt.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                <span className="text-xs font-mono text-muted-foreground/50 shrink-0 w-6 tabular-nums">{timeAgo(evt.createdAt)}</span>
                <span className={cn("text-xs font-mono shrink-0", eventTypeColor[evt.type] ?? "text-muted-foreground")}>
                  [{evt.type.replace(/_/g," ").toUpperCase().slice(0,12)}]
                </span>
                <span className="text-xs text-foreground leading-relaxed line-clamp-1">{evt.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical missions */}
      {criticalMissions.length > 0 && (
        <div className="bg-card border border-border p-5">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
            <Target className="h-3 w-3" /> CRITICAL MISSIONS ({criticalMissions.length})
          </div>
          <div className="grid grid-cols-2 gap-2">
            {criticalMissions.slice(0, 6).map(m => (
              <div key={m.id} className="flex items-start gap-3 py-2 border border-border px-3">
                <div className="mt-0.5">{missionStatusIcon[m.status as keyof typeof missionStatusIcon]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.title}</div>
                  <div className="text-xs font-mono text-muted-foreground">{m.category} / {m.status.toUpperCase()}</div>
                </div>
                <span className={cn("text-xs font-mono font-bold shrink-0", priorityColor[m.priority])}>
                  {m.priority.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
