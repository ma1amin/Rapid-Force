import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Building2, CheckCircle2, XCircle, Users, Search,
  ChevronRight, RefreshCcw, Copy, Check, ChevronDown, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tenant {
  id: number; name: string; slug: string;
  tier: "trial" | "starter" | "professional" | "enterprise";
  licenseKey: string; isActive: boolean; trialEndsAt: string | null;
  createdAt: string; userCount: number;
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
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(licenseKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
    >
      <span className="font-mono">{licenseKey.slice(0, 13)}…</span>
      {copied ? <Check className="h-3 w-3 text-primary shrink-0" /> : <Copy className="h-3 w-3 shrink-0" />}
    </button>
  );
}

const TIERS = ["trial", "starter", "professional", "enterprise"] as const;

export default function AdminTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [tierDropOpen, setTierDropOpen] = useState(false);

  const fetchTenants = async () => {
    try {
      const r = await fetch(`${BASE}/api/admin/tenants`, { credentials: "include" });
      setTenants(await r.json());
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchTenants(); }, []);

  const refresh = () => { setRefreshing(true); fetchTenants(); };

  const toggleActive = async (t: Tenant) => {
    setTogglingId(t.id);
    try {
      await fetch(`${BASE}/api/admin/tenants/${t.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      setTenants((prev) => prev.map((x) => x.id === t.id ? { ...x, isActive: !x.isActive } : x));
    } finally { setTogglingId(null); }
  };

  const runBulkAction = async (action: "suspend" | "activate" | "tier", tier?: string) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const body: any = { ids: Array.from(selectedIds), action };
      if (action === "tier" && tier) body.tier = tier;
      await fetch(`${BASE}/api/admin/tenants/bulk`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSelectedIds(new Set());
      await fetchTenants();
    } finally { setBulkLoading(false); setTierDropOpen(false); }
  };

  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.tier.includes(search.toLowerCase()) ||
    t.licenseKey.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((t) => t.id)));
  };
  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Column layout: [checkbox | org name | users | tier | license key | joined | actions]
  const COLS = "grid-cols-[32px_1fr_72px_110px_170px_90px_140px]";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-orange-400/70 tracking-widest mb-1">ADMIN PORTAL // TENANTS</div>
          <h1 className="text-2xl font-bold tracking-wider">ORGANIZATIONS</h1>
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground border border-border px-3 py-1.5 hover:border-orange-400/50 hover:text-orange-300 transition-colors disabled:opacity-50">
          <RefreshCcw className={cn("h-3 w-3", refreshing && "animate-spin")} />REFRESH
        </button>
      </div>

      {/* Stats */}
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

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 px-4 py-2.5">
          <span className="text-xs font-mono text-orange-300 font-bold shrink-0">
            {selectedIds.size} SELECTED
          </span>
          <div className="flex-1" />
          <button onClick={() => runBulkAction("activate")} disabled={bulkLoading}
            className="flex items-center gap-1.5 text-xs font-mono border border-primary/40 text-primary px-3 py-1.5 hover:bg-primary/10 transition-colors disabled:opacity-40">
            {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}ACTIVATE
          </button>
          <button onClick={() => runBulkAction("suspend")} disabled={bulkLoading}
            className="flex items-center gap-1.5 text-xs font-mono border border-destructive/40 text-destructive px-3 py-1.5 hover:bg-destructive/10 transition-colors disabled:opacity-40">
            {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}SUSPEND
          </button>
          <div className="relative">
            <button onClick={() => setTierDropOpen((v) => !v)} disabled={bulkLoading}
              className="flex items-center gap-1.5 text-xs font-mono border border-orange-400/40 text-orange-300 px-3 py-1.5 hover:bg-orange-400/10 transition-colors disabled:opacity-40">
              SET TIER <ChevronDown className="h-3 w-3" />
            </button>
            {tierDropOpen && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border z-20 min-w-[130px]">
                {TIERS.map((t) => (
                  <button key={t} onClick={() => runBulkAction("tier", t)}
                    className={cn("w-full text-left px-3 py-2 text-xs font-mono hover:bg-sidebar-accent transition-colors", TIER_STYLE[t])}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setSelectedIds(new Set())}
            className="text-xs font-mono text-muted-foreground hover:text-foreground px-2 py-1.5 transition-colors">
            CLEAR
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, tier, or license key..."
          className="w-full bg-card border border-border pl-9 pr-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50 placeholder:text-muted-foreground/50" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border overflow-hidden">
        {/* Header row */}
        <div className={cn("grid gap-3 px-4 py-2.5 border-b border-border items-center", COLS)}>
          <div className="flex items-center justify-center">
            <input type="checkbox" checked={allSelected} onChange={toggleAll}
              className="accent-orange-400 cursor-pointer h-3.5 w-3.5" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest">ORGANIZATION</span>
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest">USERS</span>
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest">TIER</span>
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest">LICENSE KEY</span>
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest">JOINED</span>
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest">ACTIONS</span>
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
                  "grid gap-3 items-center px-4 py-3 transition-colors",
                  COLS,
                  selectedIds.has(t.id) ? "bg-orange-500/5" : "",
                  !t.isActive && "opacity-50"
                )}
              >
                {/* Checkbox */}
                <div className="flex items-center justify-center">
                  <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleOne(t.id)}
                    className="accent-orange-400 cursor-pointer h-3.5 w-3.5" />
                </div>

                {/* Org name */}
                <div className="flex items-center gap-2.5 min-w-0">
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
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span>{t.userCount}</span>
                </div>

                {/* Tier */}
                <span className={cn("text-xs font-mono border px-2 py-0.5 w-fit", TIER_STYLE[t.tier])}>
                  {t.tier.toUpperCase()}
                </span>

                {/* License key */}
                <CopyKey licenseKey={t.licenseKey} />

                {/* Joined */}
                <span className="text-xs font-mono text-muted-foreground">
                  {new Date(t.createdAt).toLocaleDateString()}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(t)}
                    disabled={togglingId === t.id}
                    title={t.isActive ? "Suspend" : "Activate"}
                    className={cn(
                      "flex items-center justify-center w-7 h-7 border transition-colors disabled:opacity-40",
                      t.isActive
                        ? "text-destructive border-destructive/40 hover:bg-destructive/10"
                        : "text-primary border-primary/40 hover:bg-primary/10"
                    )}
                  >
                    {togglingId === t.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : t.isActive
                        ? <XCircle className="h-3.5 w-3.5" />
                        : <CheckCircle2 className="h-3.5 w-3.5" />
                    }
                  </button>
                  <Link
                    href={`/admin/tenants/${t.id}`}
                    className="flex items-center gap-1 text-xs font-mono text-muted-foreground border border-border px-2.5 py-1 hover:border-orange-400/50 hover:text-orange-300 transition-colors whitespace-nowrap"
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
        {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
      </div>
    </div>
  );
}
