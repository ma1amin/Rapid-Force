import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Building2, Users, DollarSign, TrendingUp,
  CheckCircle2, XCircle, ArrowRight, RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TierCount { tier: string; count: number }
interface RecentTenant {
  id: number; name: string; tier: string; isActive: boolean; createdAt: string; licenseKey: string;
}
interface Stats {
  tierCounts: TierCount[];
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  mrr: number;
  recentTenants: RecentTenant[];
}

const TIER_COLOR: Record<string, string> = {
  trial:        "text-muted-foreground border-border",
  starter:      "text-primary border-primary/40 bg-primary/5",
  professional: "text-accent border-accent/40 bg-accent/5",
  enterprise:   "text-orange-400 border-orange-400/40 bg-orange-400/5",
};

const TIER_BAR: Record<string, string> = {
  trial: "bg-muted-foreground/40",
  starter: "bg-primary",
  professional: "bg-accent",
  enterprise: "bg-orange-400",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const r = await fetch(`${BASE}/api/admin/stats`, { credentials: "include" });
      const data = await r.json();
      setStats(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const refresh = () => { setRefreshing(true); fetchStats(); };

  const metrics = stats
    ? [
        { label: "Total Orgs",     value: stats.totalTenants,               icon: Building2,   color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
        { label: "Active Orgs",    value: stats.activeTenants,              icon: CheckCircle2,color: "text-primary",     bg: "bg-primary/10 border-primary/20" },
        { label: "Total Users",    value: stats.totalUsers,                 icon: Users,       color: "text-accent",      bg: "bg-accent/10 border-accent/20" },
        { label: "Est. MRR",       value: `$${stats.mrr.toLocaleString()}`, icon: DollarSign,  color: "text-orange-300",  bg: "bg-orange-300/10 border-orange-300/20" },
      ]
    : [];

  const maxCount = stats ? Math.max(...stats.tierCounts.map((t) => Number(t.count)), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-orange-400/70 tracking-widest mb-1">RAPID FORCE // ADMIN PORTAL</div>
          <h1 className="text-2xl font-bold tracking-wider">PLATFORM DASHBOARD</h1>
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

      {/* Metric cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className={cn("border p-4", m.bg)}>
              <div className="flex items-start justify-between mb-3">
                <m.icon className={cn("h-5 w-5", m.color)} />
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/40" />
              </div>
              <div className={cn("text-2xl font-bold font-mono", m.color)}>{m.value}</div>
              <div className="text-xs font-mono text-muted-foreground mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier distribution */}
        <div className="bg-card border border-border p-5">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4">SUBSCRIPTION TIER BREAKDOWN</div>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-muted animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {["enterprise", "professional", "starter", "trial"].map((tier) => {
                const tc = stats?.tierCounts.find((t) => t.tier === tier);
                const count = Number(tc?.count ?? 0);
                const pct = (count / maxCount) * 100;
                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-xs font-mono border px-1.5 py-0.5", TIER_COLOR[tier])}>{tier.toUpperCase()}</span>
                      <span className="text-sm font-mono font-bold">{count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", TIER_BAR[tier])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-card border border-border p-5">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4">QUICK ACTIONS</div>
          <div className="space-y-2">
            {[
              { label: "Manage All Tenants",    desc: "View, edit tiers, suspend orgs",      href: "/admin/tenants", icon: Building2 },
              { label: "Manage All Users",       desc: "View users across all organizations", href: "/admin/users",   icon: Users },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 border border-border p-4 hover:border-orange-400/50 hover:bg-orange-400/5 transition-colors group"
              >
                <action.icon className="h-5 w-5 text-muted-foreground group-hover:text-orange-400 transition-colors shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium group-hover:text-orange-300 transition-colors">{action.label}</div>
                  <div className="text-xs font-mono text-muted-foreground">{action.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-orange-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent registrations */}
      <div className="bg-card border border-border">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="text-xs font-mono text-muted-foreground tracking-widest">RECENT REGISTRATIONS</div>
          <Link href="/admin/tenants" className="text-xs font-mono text-orange-400 hover:text-orange-300 flex items-center gap-1">
            VIEW ALL <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse" />)}</div>
        ) : (
          <div className="divide-y divide-border">
            {stats?.recentTenants.map((t) => (
              <Link
                key={t.id}
                href={`/admin/tenants/${t.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-orange-400/5 transition-colors group"
              >
                <div className="flex h-7 w-7 items-center justify-center bg-orange-400/10 border border-orange-400/20 text-xs font-bold text-orange-300 shrink-0">
                  {t.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate group-hover:text-orange-300 transition-colors">{t.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className={cn("text-xs font-mono border px-2 py-0.5 shrink-0", TIER_COLOR[t.tier])}>
                  {t.tier.toUpperCase()}
                </span>
                {t.isActive
                  ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  : <XCircle className="h-4 w-4 text-destructive shrink-0" />
                }
              </Link>
            ))}
            {(!stats?.recentTenants?.length) && (
              <div className="px-5 py-8 text-center text-xs font-mono text-muted-foreground">No organizations registered yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
