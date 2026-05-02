import { useListActivity, getListActivityQueryKey } from "@workspace/api-client-react";
import { ActivitySquare, AlertTriangle, CheckCircle2, Play, Cpu, FileText, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const eventConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  threat_detected: { icon: <AlertTriangle className="h-3 w-3" />, color: "text-destructive", label: "THREAT DETECTED" },
  threat_mitigated: { icon: <CheckCircle2 className="h-3 w-3" />, color: "text-primary", label: "THREAT MITIGATED" },
  mission_created: { icon: <FileText className="h-3 w-3" />, color: "text-muted-foreground", label: "MISSION CREATED" },
  mission_complete: { icon: <CheckCircle2 className="h-3 w-3" />, color: "text-primary", label: "MISSION COMPLETE" },
  mission_updated: { icon: <FileText className="h-3 w-3" />, color: "text-muted-foreground", label: "MISSION UPDATED" },
  sprint_started: { icon: <Play className="h-3 w-3" />, color: "text-accent", label: "SPRINT STARTED" },
  sprint_complete: { icon: <CheckCircle2 className="h-3 w-3" />, color: "text-primary", label: "SPRINT COMPLETE" },
  sprint_planning: { icon: <FileText className="h-3 w-3" />, color: "text-accent", label: "SPRINT PLANNING" },
  agent_activated: { icon: <Cpu className="h-3 w-3" />, color: "text-primary", label: "AGENT ACTIVATED" },
  agent_status_change: { icon: <Cpu className="h-3 w-3" />, color: "text-muted-foreground", label: "AGENT STATUS" },
};

const defaultConfig = { icon: <ActivitySquare className="h-3 w-3" />, color: "text-muted-foreground", label: "SYSTEM EVENT" };

function timeAgo(date: string) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Activity() {
  const qc = useQueryClient();
  const { data: activity, isLoading, isFetching } = useListActivity(
    { limit: 50 },
    { query: { queryKey: getListActivityQueryKey({ limit: 50 }) } }
  );

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: getListActivityQueryKey({ limit: 50 }) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // SYSTEM TELEMETRY</div>
          <h1 className="text-2xl font-bold tracking-wider">EVENT LOG</h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center gap-2 border border-border px-4 py-2 text-sm font-mono text-muted-foreground hover:text-foreground hover:border-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          REFRESH
        </button>
      </div>

      {/* Event count */}
      <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
        <ActivitySquare className="h-3 w-3" />
        SHOWING {activity?.length ?? 0} EVENTS — SORTED BY RECENCY
      </div>

      {/* Event log */}
      {isLoading ? (
        <div className="text-sm font-mono text-muted-foreground">LOADING EVENT LOG...</div>
      ) : (
        <div className="bg-card border border-border divide-y divide-border">
          {activity?.map((evt, i) => {
            const cfg = eventConfig[evt.type] ?? defaultConfig;
            return (
              <div
                key={evt.id}
                className="flex items-start gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                {/* Line number */}
                <span className="text-xs font-mono text-muted-foreground/40 w-6 shrink-0 select-none pt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Timestamp */}
                <span className="text-xs font-mono text-muted-foreground shrink-0 pt-0.5 w-16">
                  {timeAgo(evt.createdAt)}
                </span>

                {/* Event type badge */}
                <span className={`flex items-center gap-1 text-xs font-mono shrink-0 pt-0.5 w-36 ${cfg.color}`}>
                  {cfg.icon}
                  {cfg.label}
                </span>

                {/* Message */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground">{evt.message}</span>
                  {evt.agentName && (
                    <span className="ml-2 text-xs font-mono text-primary">← {evt.agentName}</span>
                  )}
                </div>

                {/* Entity */}
                {evt.entityType && (
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    {evt.entityType.toUpperCase()} #{evt.entityId}
                  </span>
                )}
              </div>
            );
          })}
          {activity?.length === 0 && (
            <div className="text-center py-12 font-mono text-sm text-muted-foreground">
              <ActivitySquare className="h-8 w-8 mx-auto mb-3 opacity-30" />
              NO EVENTS LOGGED
            </div>
          )}
        </div>
      )}
    </div>
  );
}
