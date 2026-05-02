import { useEffect, useState } from "react";
import { RefreshCcw, Filter, Building2, User, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: number;
  action: string;
  actorEmail: string;
  targetType: string | null;
  targetId: number | null;
  targetName: string | null;
  metadata: string | null;
  createdAt: string;
}

const ACTION_STYLE: Record<string, string> = {
  IMPERSONATION_STARTED:  "text-orange-300 border-orange-300/40 bg-orange-300/5",
  IMPERSONATION_ENDED:    "text-orange-400/70 border-orange-400/20 bg-orange-400/5",
  TENANT_TIER_CHANGED:    "text-primary border-primary/40 bg-primary/5",
  TENANT_SUSPENDED:       "text-destructive border-destructive/40 bg-destructive/5",
  TENANT_ACTIVATED:       "text-primary border-primary/40 bg-primary/5",
  TENANT_KEY_REGEN:       "text-accent border-accent/40 bg-accent/5",
  MODULE_TOGGLED:         "text-accent border-accent/40 bg-accent/5",
  USER_DEACTIVATED:       "text-destructive border-destructive/40 bg-destructive/5",
  USER_ACTIVATED:         "text-primary border-primary/40 bg-primary/5",
  USER_ROLE_CHANGED:      "text-accent border-accent/40 bg-accent/5",
  BULK_SUSPEND:           "text-destructive border-destructive/40 bg-destructive/5",
  BULK_ACTIVATE:          "text-primary border-primary/40 bg-primary/5",
  BULK_TIER_CHANGE:       "text-primary border-primary/40 bg-primary/5",
  TRIAL_EXPIRY_SET:       "text-orange-300 border-orange-300/40 bg-orange-300/5",
};

const ACTION_GROUP: Record<string, string> = {
  IMPERSONATION_STARTED: "IMPERSONATION",
  IMPERSONATION_ENDED: "IMPERSONATION",
  TENANT_TIER_CHANGED: "TENANT",
  TENANT_SUSPENDED: "TENANT",
  TENANT_ACTIVATED: "TENANT",
  TENANT_KEY_REGEN: "TENANT",
  MODULE_TOGGLED: "MODULE",
  USER_DEACTIVATED: "USER",
  USER_ACTIVATED: "USER",
  USER_ROLE_CHANGED: "USER",
  BULK_SUSPEND: "BULK",
  BULK_ACTIVATE: "BULK",
  BULK_TIER_CHANGE: "BULK",
  TRIAL_EXPIRY_SET: "TRIAL",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MetadataDisplay({ raw }: { raw: string | null }) {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    const entries = Object.entries(obj);
    if (entries.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
        {entries.map(([k, v]) => (
          <span key={k} className="text-[10px] font-mono text-muted-foreground">
            <span className="text-muted-foreground/50">{k}:</span>{" "}
            <span className="text-foreground/70">{String(v)}</span>
          </span>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}

const ALL_GROUPS = ["ALL", "IMPERSONATION", "TENANT", "MODULE", "USER", "BULK", "TRIAL"];

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("ALL");

  const fetchLogs = async () => {
    try {
      const r = await fetch(`${BASE}/api/admin/audit-logs?limit=200`, { credentials: "include" });
      setLogs(await r.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const refresh = () => { setRefreshing(true); fetchLogs(); };

  const filtered = filter === "ALL"
    ? logs
    : logs.filter((l) => ACTION_GROUP[l.action] === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-orange-400/70 tracking-widest mb-1">ADMIN PORTAL // AUDIT</div>
          <h1 className="text-2xl font-bold tracking-wider">AUDIT LOG</h1>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground border border-border px-3 py-1.5 hover:border-orange-400/50 hover:text-orange-300 transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={cn("h-3 w-3", refreshing && "animate-spin")} />
          REFRESH
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "TOTAL EVENTS", value: logs.length },
          { label: "IMPERSONATIONS", value: logs.filter((l) => l.action === "IMPERSONATION_STARTED").length },
          { label: "TENANT CHANGES", value: logs.filter((l) => l.action.startsWith("TENANT_")).length },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border px-4 py-3">
            <div className="text-xs font-mono text-muted-foreground">{s.label}</div>
            <div className="text-xl font-bold font-mono mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {ALL_GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className={cn(
              "text-xs font-mono border px-2.5 py-1 transition-colors",
              filter === g
                ? "border-orange-400/60 text-orange-300 bg-orange-400/10"
                : "border-border text-muted-foreground hover:border-orange-400/30 hover:text-orange-400/70"
            )}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Log table */}
      <div className="bg-card border border-border overflow-hidden">
        <div className="px-5 py-2.5 border-b border-border grid grid-cols-[auto_1fr_auto_auto] gap-4 text-[10px] font-mono text-muted-foreground tracking-widest">
          <span>ACTION</span>
          <span>TARGET</span>
          <span>ACTOR</span>
          <span>TIME</span>
        </div>

        {loading ? (
          <div className="space-y-px">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-muted/30 animate-pulse border-b border-border" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs font-mono text-muted-foreground">
            {filter === "ALL" ? "No audit events recorded yet." : `No ${filter} events found.`}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((log) => (
              <div key={log.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-start px-5 py-3.5">
                {/* Action */}
                <span className={cn("text-[10px] font-mono border px-1.5 py-0.5 whitespace-nowrap mt-0.5", ACTION_STYLE[log.action] ?? "text-muted-foreground border-border")}>
                  {log.action.replace(/_/g, " ")}
                </span>

                {/* Target */}
                <div>
                  <div className="flex items-center gap-1.5">
                    {log.targetType === "tenant"
                      ? <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                      : log.targetType === "user"
                        ? <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        : <ShieldCheck className="h-3 w-3 text-muted-foreground shrink-0" />
                    }
                    <span className="text-sm font-medium">
                      {log.targetName ?? "—"}
                    </span>
                    {log.targetType && (
                      <span className="text-xs font-mono text-muted-foreground">({log.targetType})</span>
                    )}
                  </div>
                  <MetadataDisplay raw={log.metadata} />
                </div>

                {/* Actor */}
                <div className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                  {log.actorEmail}
                </div>

                {/* Time */}
                <div className="text-right">
                  <div className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {relativeTime(log.createdAt)}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground/50">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs font-mono text-muted-foreground">
        Showing {filtered.length} of {logs.length} events · Last 200 records
      </div>
    </div>
  );
}
