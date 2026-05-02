import { useEffect, useState } from "react";
import { Link } from "wouter";
import { RefreshCcw, AlertTriangle, Clock, TrendingUp, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthData { month: string; mrr: number; count?: number }
interface TrialAlert { id: number; name: string; trialEndsAt: string }
interface InactiveTenant { id: number; name: string; tier: string; lastActivityAt: string | null }
interface Analytics {
  mrrByMonth: MonthData[];
  registrationsByMonth: MonthData[];
  trialExpiringSoon: TrialAlert[];
  inactiveTenants: InactiveTenant[];
  voucherStats: { totalRedemptions: number; activeVouchers: number };
  churnedTenants: number;
  totalRevenuePotential: number;
}

const TIER_STYLE: Record<string, string> = {
  trial: "text-muted-foreground border-border", starter: "text-primary border-primary/40",
  professional: "text-accent border-accent/40", enterprise: "text-orange-400 border-orange-400/40",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function BarChart({ data, valueKey, color, formatValue }: {
  data: MonthData[]; valueKey: "mrr" | "count"; color: string; formatValue: (v: number) => string;
}) {
  const values = data.map((d) => (valueKey === "mrr" ? d.mrr : (d.count ?? 0)));
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-2 h-32 mt-3">
      {data.map((d, i) => {
        const v = values[i] ?? 0;
        const pct = (v / max) * 100;
        const label = d.month.slice(5); // MM
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex flex-col items-center">
              <span className="absolute -top-5 text-[9px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {formatValue(v)}
              </span>
              <div className="w-full rounded-sm transition-all duration-500" style={{ height: `${Math.max(pct, 2)}%`, minHeight: "4px", backgroundColor: `hsl(var(--${color}))`, opacity: 0.8 + i * 0.04 }} />
            </div>
            <span className="text-[9px] font-mono text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function daysSince(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  return d === 0 ? "Today" : `${d}d ago`;
}

export default function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    try {
      const r = await fetch(`${BASE}/api/admin/analytics`, { credentials: "include" });
      setData(await r.json());
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const r = await fetch(`${BASE}/api/admin/audit-logs/export`, { credentials: "include" });
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "audit-logs.csv"; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-orange-400/70 tracking-widest mb-1">ADMIN PORTAL // ANALYTICS</div>
          <h1 className="text-2xl font-bold tracking-wider">ANALYTICS & INSIGHTS</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={exporting}
            className="flex items-center gap-1.5 text-xs font-mono border border-border text-muted-foreground px-3 py-1.5 hover:border-orange-400/50 hover:text-orange-300 transition-colors disabled:opacity-50">
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}EXPORT AUDIT CSV
          </button>
          <button onClick={() => { setRefreshing(true); fetchData(); }} disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-mono border border-border text-muted-foreground px-3 py-1.5 hover:border-orange-400/50 hover:text-orange-300 transition-colors disabled:opacity-50">
            <RefreshCcw className={cn("h-3 w-3", refreshing && "animate-spin")} />REFRESH
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-card border border-border animate-pulse" />)}</div>
      ) : data && (
        <>
          {/* Top metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "EST. CURRENT MRR", value: `$${(data.mrrByMonth.at(-1)?.mrr ?? 0).toLocaleString()}`, color: "text-orange-400" },
              { label: "REVENUE POTENTIAL", value: `$${data.totalRevenuePotential.toLocaleString()}/mo`, color: "text-primary" },
              { label: "CHURNED TENANTS", value: data.churnedTenants, color: "text-destructive" },
              { label: "VOUCHER REDEMPTIONS", value: data.voucherStats.totalRedemptions, color: "text-accent" },
            ].map((m) => (
              <div key={m.label} className="bg-card border border-border px-4 py-3">
                <div className="text-xs font-mono text-muted-foreground">{m.label}</div>
                <div className={cn("text-xl font-bold font-mono mt-0.5", m.color)}>{m.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* MRR chart */}
            <div className="bg-card border border-border p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div className="text-xs font-mono text-muted-foreground tracking-widest">MRR TREND (6 MONTHS)</div>
              </div>
              <BarChart data={data.mrrByMonth} valueKey="mrr" color="primary" formatValue={(v) => `$${v.toLocaleString()}`} />
              <div className="flex justify-between mt-2">
                <span className="text-xs font-mono text-muted-foreground">6 months ago</span>
                <span className="text-xs font-mono text-muted-foreground">This month</span>
              </div>
            </div>

            {/* Registrations chart */}
            <div className="bg-card border border-border p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-accent" />
                <div className="text-xs font-mono text-muted-foreground tracking-widest">NEW REGISTRATIONS (6 MONTHS)</div>
              </div>
              <BarChart data={data.registrationsByMonth} valueKey="count" color="accent" formatValue={(v) => `${v} org${v !== 1 ? "s" : ""}`} />
              <div className="flex justify-between mt-2">
                <span className="text-xs font-mono text-muted-foreground">6 months ago</span>
                <span className="text-xs font-mono text-muted-foreground">This month</span>
              </div>
            </div>
          </div>

          {/* Trial expiry alerts */}
          <div className="bg-card border border-orange-500/30">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-orange-500/20">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <div className="text-xs font-mono text-orange-400/80 tracking-widest">TRIAL EXPIRY ALERTS</div>
              <span className="ml-auto text-xs font-mono text-orange-400/60">{data.trialExpiringSoon.length} expiring within 7 days</span>
            </div>
            {data.trialExpiringSoon.length === 0 ? (
              <div className="px-5 py-6 text-xs font-mono text-muted-foreground">No trials expiring within 7 days.</div>
            ) : (
              <div className="divide-y divide-border">
                {data.trialExpiringSoon.map((t) => {
                  const days = daysUntil(t.trialEndsAt);
                  return (
                    <div key={t.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex h-7 w-7 items-center justify-center bg-orange-400/10 border border-orange-400/20 text-xs font-bold text-orange-300 shrink-0">
                        {t.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{t.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">Expires {new Date(t.trialEndsAt).toLocaleDateString()}</div>
                      </div>
                      <span className={cn("text-xs font-mono border px-2 py-0.5",
                        days <= 1 ? "text-destructive border-destructive/40 bg-destructive/5" :
                        days <= 3 ? "text-orange-400 border-orange-400/40 bg-orange-400/5" :
                        "text-yellow-400 border-yellow-400/40 bg-yellow-400/5"
                      )}>
                        {days <= 0 ? "TODAY" : `${days}d left`}
                      </span>
                      <Link href={`/admin/tenants/${t.id}`}
                        className="text-xs font-mono text-orange-300 hover:text-orange-200 border border-orange-400/30 px-2 py-1 transition-colors">
                        MANAGE →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inactive tenants */}
          <div className="bg-card border border-border">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="text-xs font-mono text-muted-foreground tracking-widest">INACTIVE PAID TENANTS (30+ DAYS)</div>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{data.inactiveTenants.length} tenants</span>
            </div>
            {data.inactiveTenants.length === 0 ? (
              <div className="px-5 py-6 text-xs font-mono text-muted-foreground">All paid tenants have been active recently.</div>
            ) : (
              <div className="divide-y divide-border">
                {data.inactiveTenants.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex h-7 w-7 items-center justify-center bg-muted/30 border border-border text-xs font-bold text-muted-foreground shrink-0">
                      {t.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">Last activity: {daysSince(t.lastActivityAt)}</div>
                    </div>
                    <span className={cn("text-xs font-mono border px-2 py-0.5", TIER_STYLE[t.tier])}>{t.tier.toUpperCase()}</span>
                    <Link href={`/admin/tenants/${t.id}`}
                      className="text-xs font-mono text-muted-foreground hover:text-orange-300 border border-border px-2 py-1 transition-colors">
                      VIEW →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
