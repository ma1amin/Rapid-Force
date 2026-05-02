import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Building2, CheckCircle2, XCircle, Users, Search,
  ChevronRight, RefreshCcw, Copy, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tenant {
  id: number;
  name: string;
  slug: string;
  tier: "trial" | "starter" | "professional" | "enterprise";
  licenseKey: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
}

const TIER_STYLE: Record<string, string> = {
  trial:        "text-muted-foreground border-border",
  starter:      "text-primary border-primary/40",
  professional: "text-accent border-accent/40",
  enterprise:   "text-orange-400 border-orange-400/40",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function CopyKey({ licenseKey }: { licenseKey: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
      <span>{licenseKey.slice(0, 14)}…</span>
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function AdminTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchTenants = async () => {
    try {
      const r = await fetch(`${BASE}/api/admin/tenants`, { credentials: "include" });
      const data = await r.json();
      setTenants(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchTenants(); }, []);

  const refresh = () => { setRefreshing(true); fetchTenants(); };

  const toggleActive = async (t: Tenant) => {
    setTogglingId(t.id);
    try {
      await fetch(`${BASE}/api/admin/tenants/${t.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      setTenants((prev) => prev.map((x) => x.id === t.id ? { ...x, isActive: !x.isActive } : x));
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.tier.includes(search.toLowerCase()) ||
    t.licenseKey.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-orange-400/70 tracking-widest mb-1">ADMIN PORTAL // TENANTS</div>
          <h1 className="text-2xl font-bold tracking-wider">ORGANIZATIONS</h1>
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

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "TOTAL", value: tenants.length },
          { label: "ACTIVE", value: tenants.filter((t) => t.isActive).length },
          { label: "SUSPENDED", value: tenants.filter((t) => !t.isActive).length },
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
          placeholder="Search by org name, tier, or license key..."
          className="w-full bg-card border border-border pl-9 pr-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50 placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-border text-[10px] font-mono text-muted-foreground tracking-widest">
          <span>ORGANIZATION</span>
          <span>USERS</span>
          <span>TIER</span>
          <span>LICENSE KEY</span>
          <span>JOINED</span>
          <span>ACTIONS</span>
        </div>

        {loading ? (
          <div className="space-y-px">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/30 animate-pulse border-b border-border" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-muted-foreground">
            {search ? "No organizations match your search." : "No organizations found."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 transition-colors",
                  !t.isActive && "opacity-50"
                )}
              >
                {/* Org */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center bg-orange-400/10 border border-orange-400/20 text-xs font-bold text-orange-300 shrink-0">
                    {t.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-xs font-mono text-muted-foreground truncate">{t.slug}</div>
                  </div>
                </div>

                {/* Users */}
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {t.userCount}
                </div>

                {/* Tier */}
                <span className={cn("text-xs font-mono border px-2 py-0.5", TIER_STYLE[t.tier])}>
                  {t.tier.toUpperCase()}
                </span>

                {/* Key */}
                <CopyKey licenseKey={t.licenseKey} />

                {/* Date */}
                <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                  {new Date(t.createdAt).toLocaleDateString()}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(t)}
                    disabled={togglingId === t.id}
                    title={t.isActive ? "Suspend" : "Activate"}
                    className={cn(
                      "text-xs font-mono border px-2 py-1 transition-colors disabled:opacity-40",
                      t.isActive
                        ? "text-destructive border-destructive/40 hover:bg-destructive/10"
                        : "text-primary border-primary/40 hover:bg-primary/10"
                    )}
                  >
                    {t.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                  <Link
                    href={`/admin/tenants/${t.id}`}
                    className="flex items-center gap-1 text-xs font-mono text-muted-foreground border border-border px-2 py-1 hover:border-orange-400/50 hover:text-orange-300 transition-colors"
                  >
                    VIEW <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs font-mono text-muted-foreground">
        Showing {filtered.length} of {tenants.length} organizations
      </div>
    </div>
  );
}
