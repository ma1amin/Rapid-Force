import { useState, useMemo } from "react";
import {
  useListActivity, getListActivityQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ActivitySquare, AlertTriangle, CheckCircle2, Play, Cpu, FileText,
  RefreshCw, Search, Download, X, Shield, Siren,
} from "lucide-react";
import { cn } from "@/lib/utils";

const REFETCH_MS = 15_000;

const EVENT_CATEGORIES: Record<string, { icon: React.ReactNode; color: string; label: string; category: string }> = {
  threat_detected:   { icon: <AlertTriangle  className="h-3 w-3" />, color: "text-destructive",     label: "THREAT DETECTED",  category: "threat"   },
  threat_mitigated:  { icon: <Shield          className="h-3 w-3" />, color: "text-primary",         label: "THREAT MITIGATED", category: "threat"   },
  mission_created:   { icon: <FileText        className="h-3 w-3" />, color: "text-muted-foreground",label: "MISSION CREATED",  category: "mission"  },
  mission_complete:  { icon: <CheckCircle2    className="h-3 w-3" />, color: "text-primary",         label: "MISSION COMPLETE", category: "mission"  },
  mission_updated:   { icon: <FileText        className="h-3 w-3" />, color: "text-muted-foreground",label: "MISSION UPDATED",  category: "mission"  },
  sprint_started:    { icon: <Play            className="h-3 w-3" />, color: "text-accent",           label: "SPRINT STARTED",   category: "sprint"   },
  sprint_complete:   { icon: <CheckCircle2    className="h-3 w-3" />, color: "text-primary",         label: "SPRINT COMPLETE",  category: "sprint"   },
  sprint_planning:   { icon: <FileText        className="h-3 w-3" />, color: "text-accent",           label: "SPRINT PLANNING",  category: "sprint"   },
  agent_activated:   { icon: <Cpu             className="h-3 w-3" />, color: "text-primary",         label: "AGENT ACTIVATED",  category: "agent"    },
  agent_status_change:{ icon: <Cpu            className="h-3 w-3" />, color: "text-muted-foreground",label: "AGENT STATUS",     category: "agent"    },
  incident_opened:   { icon: <Siren           className="h-3 w-3" />, color: "text-destructive",     label: "INCIDENT OPENED",  category: "incident" },
  incident_closed:   { icon: <CheckCircle2    className="h-3 w-3" />, color: "text-primary",         label: "INCIDENT CLOSED",  category: "incident" },
};

const DEFAULT_CFG = { icon: <ActivitySquare className="h-3 w-3" />, color: "text-muted-foreground", label: "SYSTEM EVENT", category: "other" };

const FILTERS = [
  { key: "all",     label: "ALL",      count_fn: (a: any[]) => a.length },
  { key: "threat",  label: "THREATS",  count_fn: (a: any[]) => a.filter(e => (EVENT_CATEGORIES[e.type]?.category ?? "other") === "threat").length  },
  { key: "incident",label: "INCIDENTS",count_fn: (a: any[]) => a.filter(e => (EVENT_CATEGORIES[e.type]?.category ?? "other") === "incident").length },
  { key: "mission", label: "MISSIONS", count_fn: (a: any[]) => a.filter(e => (EVENT_CATEGORIES[e.type]?.category ?? "other") === "mission").length },
  { key: "sprint",  label: "SPRINTS",  count_fn: (a: any[]) => a.filter(e => (EVENT_CATEGORIES[e.type]?.category ?? "other") === "sprint").length  },
  { key: "agent",   label: "AGENTS",   count_fn: (a: any[]) => a.filter(e => (EVENT_CATEGORIES[e.type]?.category ?? "other") === "agent").length   },
];

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function exportCSV(events: any[]) {
  const header = ["#", "Time", "Type", "Event", "Message", "Agent", "Entity Type", "Entity ID"];
  const rows = events.map((e, i) => [
    i + 1,
    new Date(e.createdAt).toLocaleString(),
    e.type.replace(/_/g, " ").toUpperCase(),
    EVENT_CATEGORIES[e.type]?.label ?? "SYSTEM EVENT",
    `"${e.message.replace(/"/g, '""')}"`,
    e.agentName ?? "",
    e.entityType ?? "",
    e.entityId ?? "",
  ]);
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `rf-event-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Activity() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: activity, isLoading, isFetching, dataUpdatedAt } = useListActivity(
    { limit: 200 },
    { query: { queryKey: getListActivityQueryKey({ limit: 200 }), refetchInterval: REFETCH_MS } }
  );

  const filtered = useMemo(() => {
    let items = activity ?? [];
    if (typeFilter !== "all") items = items.filter(e => (EVENT_CATEGORIES[e.type]?.category ?? "other") === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(e =>
        e.message.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        (e.agentName?.toLowerCase().includes(q)) ||
        (e.entityType?.toLowerCase().includes(q))
      );
    }
    return items;
  }, [activity, typeFilter, search]);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // SYSTEM TELEMETRY</div>
          <h1 className="text-2xl font-bold tracking-wider">EVENT LOG</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">Real-time audit trail · All platform activity</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs font-mono">
            <div className="text-muted-foreground">LAST SYNC</div>
            <div className="text-primary">{lastUpdated}</div>
          </div>
          <button onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}
            className="flex items-center gap-2 border border-border px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary transition-colors disabled:opacity-30">
            <Download className="h-3.5 w-3.5" />EXPORT CSV
          </button>
          <button onClick={() => qc.invalidateQueries({ queryKey: getListActivityQueryKey({ limit: 200 }) })}
            disabled={isFetching}
            className="flex items-center gap-2 border border-border px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary transition-colors disabled:opacity-50">
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />REFRESH
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-6 gap-2 text-xs font-mono">
        {FILTERS.map(f => {
          const count = f.count_fn(activity ?? []);
          return (
            <button key={f.key} onClick={() => setTypeFilter(f.key)}
              className={cn("border px-3 py-2 text-left transition-colors",
                typeFilter === f.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/50")}>
              <div className="text-[10px] tracking-widest mb-0.5">{f.label}</div>
              <div className={cn("text-xl font-bold", typeFilter === f.key ? "text-primary" : "text-foreground")}>{count}</div>
            </button>
          );
        })}
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events, agents, messages..."
            className="w-full bg-card border border-border pl-9 pr-8 py-2 text-sm font-mono focus:outline-none focus:border-primary placeholder:text-muted-foreground transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "event" : "events"} {(search || typeFilter !== "all") ? "matched" : "total"}
        </span>
        <span className="text-xs font-mono text-muted-foreground/50 ml-auto">AUTO-REFRESH 15s</span>
      </div>

      {/* Event log */}
      {isLoading ? (
        <div className="text-sm font-mono text-muted-foreground">LOADING EVENT LOG...</div>
      ) : (
        <div className="bg-card border border-border divide-y divide-border">
          {filtered.map((evt, i) => {
            const cfg = EVENT_CATEGORIES[evt.type] ?? DEFAULT_CFG;
            return (
              <div key={evt.id}
                className="flex items-start gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
                <span className="text-[10px] font-mono text-muted-foreground/30 w-8 shrink-0 select-none pt-0.5 tabular-nums text-right">
                  {String(i + 1).padStart(3, "0")}
                </span>
                <span className="text-xs font-mono text-muted-foreground/60 shrink-0 pt-0.5 w-16 tabular-nums">
                  {timeAgo(evt.createdAt)}
                </span>
                <span className={cn("flex items-center gap-1 text-xs font-mono shrink-0 pt-0.5 w-36", cfg.color)}>
                  {cfg.icon}{cfg.label}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground">{evt.message}</span>
                  {evt.agentName && (
                    <span className="ml-2 text-xs font-mono text-primary">← {evt.agentName}</span>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {evt.entityType && (
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {evt.entityType.toUpperCase()} #{evt.entityId}
                    </div>
                  )}
                  <div className="text-[10px] font-mono text-muted-foreground/40">
                    {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 font-mono text-sm text-muted-foreground">
              <ActivitySquare className="h-8 w-8 mx-auto mb-3 opacity-30" />
              {search || typeFilter !== "all" ? "NO EVENTS MATCH CURRENT FILTERS" : "NO EVENTS LOGGED"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
