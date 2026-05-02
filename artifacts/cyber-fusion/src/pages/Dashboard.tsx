import { useGetAgentsSummary, useListSprints, useGetThreatsSummary, useListActivity, useListMissions, getListActivityQueryKey, getListMissionsQueryKey } from "@workspace/api-client-react";
import { Cpu, ShieldAlert, Target, Zap, TrendingUp, Activity, CheckCircle2, Clock, XCircle } from "lucide-react";
import AgentStatusChart from "@/components/charts/AgentStatusChart";
import ThreatSeverityChart from "@/components/charts/ThreatSeverityChart";
import MissionStatusChart from "@/components/charts/MissionStatusChart";

const REFETCH_MS = 30_000;

function StatCard({ label, value, sub, accent = false, warn = false, danger = false }: {
  label: string; value: string | number; sub?: string; accent?: boolean; warn?: boolean; danger?: boolean;
}) {
  const color = danger ? "text-destructive" : warn ? "text-accent" : accent ? "text-primary" : "text-foreground";
  return (
    <div className="bg-card border border-border p-4 flex flex-col gap-2 min-w-28 flex-1">
      <span className="text-xs font-mono text-muted-foreground tracking-widest">{label}</span>
      <span className={`text-3xl font-bold font-mono ${color}`}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

const eventTypeColor: Record<string, string> = {
  threat_detected: "text-destructive",
  mission_complete: "text-primary",
  sprint_started: "text-accent",
  sprint_complete: "text-primary",
  agent_activated: "text-primary",
  mission_created: "text-muted-foreground",
  mission_updated: "text-muted-foreground",
  threat_mitigated: "text-primary",
  agent_status_change: "text-muted-foreground",
  sprint_planning: "text-accent",
};

const missionStatusIcon = {
  active: <Activity className="h-3 w-3 text-primary" />,
  pending: <Clock className="h-3 w-3 text-muted-foreground" />,
  complete: <CheckCircle2 className="h-3 w-3 text-primary" />,
  failed: <XCircle className="h-3 w-3 text-destructive" />,
};

const priorityColor: Record<string, string> = {
  critical: "text-destructive",
  high: "text-accent",
  medium: "text-primary",
  low: "text-muted-foreground",
};

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function Dashboard() {
  const { data: agentsSummary } = useGetAgentsSummary({ query: { refetchInterval: REFETCH_MS } });
  const { data: sprints } = useListSprints({ query: { refetchInterval: REFETCH_MS } });
  const { data: threatsSummary } = useGetThreatsSummary({ query: { refetchInterval: REFETCH_MS } });
  const { data: activity } = useListActivity(
    { limit: 10 },
    { query: { queryKey: getListActivityQueryKey({ limit: 10 }), refetchInterval: REFETCH_MS } }
  );
  const { data: missions } = useListMissions(
    {},
    { query: { queryKey: getListMissionsQueryKey({}), refetchInterval: REFETCH_MS } }
  );

  const activeSprint = sprints?.find((s) => s.status === "active");
  const criticalMissions = missions?.filter((m) => m.priority === "critical" && m.status !== "complete") ?? [];

  const now = new Date();
  const datePart = now.toISOString().substring(0, 10);
  const timePart = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "UTC" });
  const timeStr = `${datePart} ${timePart} UTC`;

  const missionCounts = {
    active: missions?.filter((m) => m.status === "active").length ?? 0,
    pending: missions?.filter((m) => m.status === "pending").length ?? 0,
    complete: missions?.filter((m) => m.status === "complete").length ?? 0,
    failed: missions?.filter((m) => m.status === "failed").length ?? 0,
  };

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
          <div className="text-xs font-mono text-primary">{timeStr}</div>
          <div className="text-xs font-mono text-muted-foreground/50 mt-0.5">AUTO-REFRESH 30s</div>
        </div>
      </div>

      {/* Agent fleet stats */}
      <div>
        <div className="text-xs font-mono text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
          <Cpu className="h-3 w-3" /> AGENT FLEET STATUS
        </div>
        <div className="flex flex-wrap gap-3">
          <StatCard label="TOTAL AGENTS" value={agentsSummary?.total ?? "—"} />
          <StatCard label="ACTIVE" value={agentsSummary?.active ?? "—"} accent />
          <StatCard label="IDLE" value={agentsSummary?.idle ?? "—"} />
          <StatCard label="STANDBY" value={agentsSummary?.standby ?? "—"} warn />
          <StatCard label="OFFLINE" value={agentsSummary?.offline ?? "—"} danger />
          <StatCard label="MISSIONS DONE" value={agentsSummary?.totalMissionsCompleted ?? "—"} accent sub="cumulative" />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div className="bg-card border border-border p-4">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-2 flex items-center gap-2">
            <Cpu className="h-3 w-3" /> AGENT UTILIZATION
          </div>
          {agentsSummary ? (
            <AgentStatusChart
              active={agentsSummary.active}
              idle={agentsSummary.idle}
              standby={agentsSummary.standby}
              offline={agentsSummary.offline}
            />
          ) : <div className="h-44 flex items-center justify-center text-xs font-mono text-muted-foreground">LOADING...</div>}
        </div>

        <div className="bg-card border border-border p-4">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-2 flex items-center gap-2">
            <ShieldAlert className="h-3 w-3" /> THREAT SEVERITY
          </div>
          {threatsSummary ? (
            <ThreatSeverityChart
              critical={threatsSummary.critical}
              high={threatsSummary.high}
              medium={threatsSummary.medium}
              low={threatsSummary.low}
            />
          ) : <div className="h-44 flex items-center justify-center text-xs font-mono text-muted-foreground">LOADING...</div>}
        </div>

        <div className="bg-card border border-border p-4">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-2 flex items-center gap-2">
            <Target className="h-3 w-3" /> MISSION STATUS
          </div>
          <MissionStatusChart
            active={missionCounts.active}
            pending={missionCounts.pending}
            complete={missionCounts.complete}
            failed={missionCounts.failed}
          />
        </div>
      </div>

      {/* Sprint + Threats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "CRITICAL/HIGH", value: threatsSummary.critical + threatsSummary.high, color: "text-destructive" },
                { label: "MEDIUM/LOW", value: threatsSummary.medium + threatsSummary.low, color: "text-primary" },
                { label: "ACTIVE", value: threatsSummary.active, color: "text-accent" },
                { label: "MONITORING", value: threatsSummary.total - threatsSummary.active - threatsSummary.mitigated, color: "text-muted-foreground" },
                { label: "MITIGATED", value: threatsSummary.mitigated, color: "text-primary" },
                { label: "TOTAL", value: threatsSummary.total, color: "text-foreground" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-background border border-border p-3 text-center">
                  <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
                  <div className="text-xs font-mono text-muted-foreground mt-1">{label}</div>
                </div>
              ))}
            </div>
          ) : <div className="text-muted-foreground text-sm font-mono">Loading...</div>}
        </div>
      </div>

      {/* Critical Missions + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-card border border-border p-5">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
            <Target className="h-3 w-3" /> CRITICAL MISSIONS
          </div>
          <div className="space-y-2">
            {criticalMissions.length === 0 ? (
              <div className="text-sm text-muted-foreground font-mono py-4 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-primary opacity-60" />
                All critical missions complete
              </div>
            ) : (
              criticalMissions.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className="mt-0.5">{missionStatusIcon[m.status as keyof typeof missionStatusIcon]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{m.title}</div>
                    <div className="text-xs font-mono text-muted-foreground">{m.category} / {m.status.toUpperCase()}</div>
                  </div>
                  <span className={`text-xs font-mono font-bold shrink-0 ${priorityColor[m.priority]}`}>
                    {m.priority.toUpperCase()}
                  </span>
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
            {activity?.slice(0, 8).map((evt) => (
              <div key={evt.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                <span className="text-xs font-mono text-muted-foreground/50 shrink-0 w-6">{timeAgo(evt.createdAt)}</span>
                <span className={`text-xs font-mono shrink-0 ${eventTypeColor[evt.type] ?? "text-muted-foreground"}`}>
                  [{evt.type.replace(/_/g, " ").toUpperCase().slice(0, 10)}]
                </span>
                <span className="text-xs text-foreground leading-relaxed line-clamp-1">{evt.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
