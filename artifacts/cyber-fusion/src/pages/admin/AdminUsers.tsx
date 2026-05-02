import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Search, CheckCircle2, XCircle, RefreshCcw, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  role: "admin" | "analyst" | "viewer";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  tenantId: number;
  tenantName: string | null;
  tenantTier: string | null;
}

const ROLE_STYLE: Record<string, string> = {
  admin:   "text-primary border-primary/40",
  analyst: "text-accent border-accent/40",
  viewer:  "text-muted-foreground border-border",
};

const TIER_STYLE: Record<string, string> = {
  trial:        "text-muted-foreground border-border",
  starter:      "text-primary border-primary/40",
  professional: "text-accent border-accent/40",
  enterprise:   "text-orange-400 border-orange-400/40",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      const r = await fetch(`${BASE}/api/admin/users`, { credentials: "include" });
      const data = await r.json();
      setUsers(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const refresh = () => { setRefreshing(true); fetchUsers(); };

  const toggleActive = async (u: AdminUser) => {
    setTogglingId(u.id);
    try {
      await fetch(`${BASE}/api/admin/users/${u.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.tenantName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    u.role.includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-orange-400/70 tracking-widest mb-1">ADMIN PORTAL // USERS</div>
          <h1 className="text-2xl font-bold tracking-wider">ALL USERS</h1>
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
          { label: "TOTAL", value: users.length },
          { label: "ACTIVE", value: users.filter((u) => u.isActive).length },
          { label: "DEACTIVATED", value: users.filter((u) => !u.isActive).length },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border px-4 py-3">
            <div className="text-xs font-mono text-muted-foreground">{s.label}</div>
            <div className="text-xl font-bold font-mono mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, organization, or role..."
          className="w-full bg-card border border-border pl-9 pr-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50 placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-border text-[10px] font-mono text-muted-foreground tracking-widest">
          <span>USER</span>
          <span>ROLE</span>
          <span>ORGANIZATION</span>
          <span>TIER</span>
          <span>LAST LOGIN</span>
          <span>ACTIONS</span>
        </div>

        {loading ? (
          <div className="space-y-px">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/30 animate-pulse border-b border-border" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-muted-foreground">
            {search ? "No users match your search." : "No users found."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((u) => (
              <div
                key={u.id}
                className={cn(
                  "grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5",
                  !u.isActive && "opacity-50"
                )}
              >
                {/* User */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center bg-primary/10 border border-primary/20 text-xs font-bold text-primary shrink-0">
                    {u.displayName[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{u.displayName}</div>
                    <div className="text-xs font-mono text-muted-foreground truncate">{u.email}</div>
                  </div>
                </div>

                {/* Role */}
                <span className={cn("text-xs font-mono border px-2 py-0.5", ROLE_STYLE[u.role])}>
                  {u.role.toUpperCase()}
                </span>

                {/* Org */}
                {u.tenantId ? (
                  <Link
                    href={`/admin/tenants/${u.tenantId}`}
                    className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-orange-300 transition-colors max-w-[140px] truncate"
                  >
                    {u.tenantName ?? "—"}
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  </Link>
                ) : (
                  <span className="text-xs font-mono text-muted-foreground">—</span>
                )}

                {/* Tier */}
                <span className={cn("text-xs font-mono border px-2 py-0.5", TIER_STYLE[u.tenantTier ?? "trial"])}>
                  {(u.tenantTier ?? "—").toUpperCase()}
                </span>

                {/* Last login */}
                <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {u.isActive
                    ? <CheckCircle2 className="h-4 w-4 text-primary" />
                    : <XCircle className="h-4 w-4 text-destructive" />
                  }
                  <button
                    onClick={() => toggleActive(u)}
                    disabled={togglingId === u.id}
                    className={cn(
                      "text-xs font-mono border px-2 py-1 transition-colors disabled:opacity-40 flex items-center gap-1",
                      u.isActive
                        ? "text-destructive border-destructive/40 hover:bg-destructive/10"
                        : "text-primary border-primary/40 hover:bg-primary/10"
                    )}
                  >
                    {togglingId === u.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : u.isActive ? "DEACTIVATE" : "ACTIVATE"
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs font-mono text-muted-foreground">
        Showing {filtered.length} of {users.length} users
      </div>
    </div>
  );
}
