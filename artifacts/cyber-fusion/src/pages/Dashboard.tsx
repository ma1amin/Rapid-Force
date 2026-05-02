import { useGetAgentsSummary, useListSprints, useGetThreatsSummary, useListActivity, useListMissions, getListActivityQueryKey } from "@workspace/api-client-react";
import { Cpu, ShieldAlert, Target, Zap, Activity, TrendingUp, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";

function StatCard({ label, value, sub, accent = false, warn = false, danger = false }: {
  label: string; value: string | number; sub?: string; accent?: boolean; warn?: boolean; danger?: boolean;
}) {
  const color = danger ? "text-destructive" : warn ? "text-accent" : accent ? "text-primary" : "text-foreground";
  return (
    <div className="bg-card border border-border p-4 flex flex-col gap-2">
      <span className="text-xs font-mono text-muted-foreground tracking-widest">{label}</span>
      <span className={`text-3xl font-bold font-mono ${color}`}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function SeverityBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono text-muted-foreground w-16">{label}</span>
      <div className="flex-1 h-1.5 bg-muted">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-foreground w-6 text-right">{value}</span>
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
  threat_mitigated: "text-secondary-foreground",
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

export default function Dashboard() {
  const { data: agentsSummary } = useGetAgentsSummary();
  const { data: sprints } = useListSprints();
  const { data: threatsSummary } = useGetThreatsSummary();
  const { data: activity } = useListActivity({ limit: 10 }, { query: { queryKey: getListActivityQueryKey({ limit: 10 }) } });
  const { data: missions } = useListMissions();

  const activeSprint = sprints?.find((s) => s.status === "active");
  const criticalMissions = missions?.filter((m) => m.priority === "critical" && m.status !== "complete") ?? [];

  const now = new Date();
  const timeStr = now.toISOString().replace("T", " ").substring(0, 19) + " UTC";

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
        </div>
      </div>

      {/* Agent fleet summary */}
      <div>
        <div className="text-xs font-mono text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
          <Cpu className="h-3 w-3" /> AGENT FLEET STATUS
        </div>
        <div className="flex flex-wrap gap-3 [&>*]:flex-1 [&>*]:min-w-32">
          <StatCard label="TOTAL AGENTS" value={agentsSummary?.total ?? "—"} />
          <StatCard label="ACTIVE" value={agentsSummary?.active ?? "—"} accent />
          <StatCard label="IDLE" value={agentsSummary?.idle ?? "—"} />
          <StatCard label="STANDBY" value={agentsSummary?.standby ?? "—"} warn />
          <StatCard label="OFFLINE" value={agentsSummary?.offline ?? "—"} danger />
          <StatCard label="MISSIONS DONE" value={agentsSummary?.totalMissionsCompleted ?? "—"} accent sub="cumulative" />
        </div>
      </div>

      {/* Sprint + Threats row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Sprint */}
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

        {/* Threat Summary */}
        <div className="bg-card border border-border p-5">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
            <ShieldAlert className="h-3 w-3" /> THREAT INTELLIGENCE
          </div>
          {threatsSummary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono text-destructive">{threatsSummary.critical + threatsSummary.high}</div>
                  <div className="text-xs font-mono text-muted-foreground">CRITICAL/HIGH</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono text-primary">{threatsSummary.mitigated}</div>
                  <div className="text-xs font-mono text-muted-foreground">MITIGATED</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono text-accent">{threatsSummary.active}</div>
                  <div className="text-xs font-mono text-muted-foreground">ACTIVE</div>
                </div>
              </div>
              <div className="space-y-2">
                <SeverityBar label="CRITICAL" value={threatsSummary.critical} total={threatsSummary.total} color="bg-destructive" />
                <SeverityBar label="HIGH" value={threatsSummary.high} total={threatsSummary.total} color="bg-accent" />
                <SeverityBar label="MEDIUM" value={threatsSummary.medium} total={threatsSummary.total} color="bg-primary" />
                <SeverityBar label="LOW" value={threatsSummary.low} total={threatsSummary.total} color="bg-muted-foreground" />
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm font-mono">Loading...</div>
          )}
        </div>
      </div>

      {/* Critical Missions + Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Critical Missions */}
        <div className="bg-card border border-border p-5">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
            <Target className="h-3 w-3" /> CRITICAL MISSIONS
          </div>
          <div className="space-y-2">
            {criticalMissions.length === 0 ? (
              <div className="text-sm text-muted-foreground font-mono">All critical missions complete</div>
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

        {/* Activity Feed */}
        <div className="bg-card border border-border p-5">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp className="h-3 w-3" /> RECENT ACTIVITY
          </div>
          <div className="space-y-2">
            {activity?.slice(0, 8).map((evt) => (
              <div key={evt.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                <span className={`text-xs font-mono shrink-0 ${eventTypeColor[evt.type] ?? "text-muted-foreground"}`}>
                  [{evt.type.replace(/_/g, " ").toUpperCase().slice(0, 12)}]
                </span>
                <span className="text-xs text-foreground leading-relaxed">{evt.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
