import { useEffect, useState } from "react";
import { Plus, Tag, Trash2, RefreshCcw, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Loader2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Voucher {
  id: number; code: string; description: string | null;
  discountType: string; discountValue: number;
  tierRestriction: string | null; maxUses: number | null;
  usedCount: number; expiresAt: string | null;
  isActive: boolean; createdAt: string;
}

interface Redemption { id: number; tenantName: string | null; redeemedAt: string }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const TIERS = ["trial", "starter", "professional", "enterprise"] as const;

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

const TIER_STYLE: Record<string, string> = {
  trial: "text-muted-foreground border-border",
  starter: "text-primary border-primary/40",
  professional: "text-accent border-accent/40",
  enterprise: "text-orange-400 border-orange-400/40",
};

export default function AdminVouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [redemptions, setRedemptions] = useState<Record<number, Redemption[]>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    code: "", description: "", discountType: "percent", discountValue: "10",
    tierRestriction: "", maxUses: "", expiresAt: "",
  });

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/vouchers`, { credentials: "include" });
      setVouchers(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchVouchers(); }, []);

  const createVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/admin/vouchers`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          description: form.description || undefined,
          discountType: form.discountType,
          discountValue: parseInt(form.discountValue),
          tierRestriction: form.tierRestriction || null,
          maxUses: form.maxUses ? parseInt(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
        }),
      });
      if (!r.ok) { const err = await r.json(); alert(err.error ?? "Failed"); return; }
      await fetchVouchers();
      setShowCreate(false);
      setForm({ code: "", description: "", discountType: "percent", discountValue: "10", tierRestriction: "", maxUses: "", expiresAt: "" });
    } finally { setSaving(false); }
  };

  const toggleActive = async (v: Voucher) => {
    await fetch(`${BASE}/api/admin/vouchers/${v.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !v.isActive }),
    });
    setVouchers((prev) => prev.map((x) => x.id === v.id ? { ...x, isActive: !x.isActive } : x));
  };

  const deleteVoucher = async (id: number) => {
    if (!confirm("Delete this voucher? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch(`${BASE}/api/admin/vouchers/${id}`, { method: "DELETE", credentials: "include" });
      setVouchers((prev) => prev.filter((v) => v.id !== id));
    } finally { setDeletingId(null); }
  };

  const loadRedemptions = async (id: number) => {
    if (redemptions[id]) { setExpandedId(expandedId === id ? null : id); return; }
    const r = await fetch(`${BASE}/api/admin/vouchers/${id}/redemptions`, { credentials: "include" });
    const data = await r.json();
    setRedemptions((prev) => ({ ...prev, [id]: data }));
    setExpandedId(id);
  };

  const totalSavings = vouchers.reduce((s, v) => {
    if (v.discountType === "flat") return s + v.discountValue * v.usedCount;
    return s;
  }, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-orange-400/70 tracking-widest mb-1">ADMIN PORTAL // VOUCHERS</div>
          <h1 className="text-2xl font-bold tracking-wider">VOUCHERS & COUPONS</h1>
        </div>
        <button onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-mono border border-orange-400/50 text-orange-300 bg-orange-500/10 px-3 py-1.5 hover:bg-orange-500/20 transition-colors">
          <Plus className="h-3.5 w-3.5" />CREATE VOUCHER
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "TOTAL VOUCHERS", value: vouchers.length },
          { label: "ACTIVE", value: vouchers.filter((v) => v.isActive).length },
          { label: "TOTAL REDEMPTIONS", value: vouchers.reduce((s, v) => s + v.usedCount, 0) },
          { label: "FLAT SAVINGS GIVEN", value: `$${totalSavings}` },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border px-4 py-3">
            <div className="text-xs font-mono text-muted-foreground">{s.label}</div>
            <div className="text-xl font-bold font-mono mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-card border border-orange-500/30 p-5">
          <div className="text-xs font-mono text-orange-400/70 tracking-widest mb-4">NEW VOUCHER</div>
          <form onSubmit={createVoucher} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1.5">CODE *</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SAVE20OFF" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50 uppercase" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1.5">DESCRIPTION</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="20% off starter plan" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1.5">DISCOUNT TYPE</label>
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50">
                <option value="percent">PERCENT (%)</option>
                <option value="flat">FLAT ($)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1.5">
                VALUE ({form.discountType === "percent" ? "%" : "$"}) *
              </label>
              <input required type="number" min="1" max={form.discountType === "percent" ? "100" : "9999"}
                value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1.5">TIER RESTRICTION</label>
              <select value={form.tierRestriction} onChange={(e) => setForm({ ...form, tierRestriction: e.target.value })}
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50">
                <option value="">ANY TIER</option>
                {TIERS.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1.5">MAX USES</label>
              <input type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                placeholder="Unlimited" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-mono text-muted-foreground block mb-1.5">EXPIRES AT</label>
              <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50" />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 text-xs font-mono bg-orange-500 text-white px-4 py-2 hover:bg-orange-600 transition-colors disabled:opacity-50">
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}CREATE VOUCHER
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="text-xs font-mono border border-border text-muted-foreground px-4 py-2 hover:text-foreground transition-colors">
                CANCEL
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vouchers list */}
      <div className="bg-card border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_100px_80px_80px_80px_90px] gap-3 px-4 py-2.5 border-b border-border text-[10px] font-mono text-muted-foreground tracking-widest">
          <span>CODE</span><span>DISCOUNT</span><span>TIER</span><span>USES</span><span>EXPIRES</span><span>STATUS</span><span>ACTIONS</span>
        </div>
        {loading ? (
          <div className="space-y-px">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted/30 animate-pulse border-b border-border" />)}</div>
        ) : vouchers.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-muted-foreground">No vouchers created yet. Create one to get started.</div>
        ) : (
          <div className="divide-y divide-border">
            {vouchers.map((v) => (
              <div key={v.id}>
                <div className={cn("grid grid-cols-[1fr_90px_100px_80px_80px_80px_90px] gap-3 items-center px-4 py-3", !v.isActive && "opacity-50")}>
                  <div>
                    <div className="flex items-center font-mono font-bold text-sm text-orange-300">
                      <Tag className="h-3.5 w-3.5 mr-1.5 shrink-0" />{v.code}<CopyCode code={v.code} />
                    </div>
                    {v.description && <div className="text-xs text-muted-foreground mt-0.5">{v.description}</div>}
                  </div>
                  <span className="text-sm font-mono font-bold">
                    {v.discountType === "percent" ? `${v.discountValue}%` : `$${v.discountValue}`}
                    <span className="text-xs font-normal text-muted-foreground ml-1">OFF</span>
                  </span>
                  <span className={cn("text-xs font-mono border px-2 py-0.5 w-fit", v.tierRestriction ? TIER_STYLE[v.tierRestriction] : "text-muted-foreground border-border")}>
                    {v.tierRestriction?.toUpperCase() ?? "ANY"}
                  </span>
                  <div className="text-xs font-mono">
                    <span className="font-bold">{v.usedCount}</span>
                    <span className="text-muted-foreground">/{v.maxUses ?? "∞"}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : "Never"}
                  </span>
                  <span className={cn("text-xs font-mono", v.isActive ? "text-primary" : "text-muted-foreground")}>
                    {v.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggleActive(v)} title={v.isActive ? "Deactivate" : "Activate"}
                      className="text-muted-foreground hover:text-orange-300 transition-colors">
                      {v.isActive ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
                    </button>
                    <button onClick={() => loadRedemptions(v.id)} title="View redemptions"
                      className="text-xs font-mono text-muted-foreground hover:text-orange-300 transition-colors">
                      {expandedId === v.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => deleteVoucher(v.id)} disabled={deletingId === v.id}
                      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40">
                      {deletingId === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                {/* Redemptions */}
                {expandedId === v.id && (
                  <div className="bg-background/40 border-t border-border px-8 py-3">
                    <div className="text-[10px] font-mono text-muted-foreground tracking-widest mb-2">REDEMPTIONS ({redemptions[v.id]?.length ?? 0})</div>
                    {redemptions[v.id]?.length === 0 ? (
                      <div className="text-xs font-mono text-muted-foreground">No redemptions yet.</div>
                    ) : (
                      <div className="space-y-1">
                        {redemptions[v.id]?.map((r) => (
                          <div key={r.id} className="flex items-center gap-4 text-xs font-mono">
                            <span className="text-foreground/80">{r.tenantName ?? "Unknown"}</span>
                            <span className="text-muted-foreground">{new Date(r.redeemedAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="text-xs font-mono text-muted-foreground">{vouchers.length} voucher{vouchers.length !== 1 ? "s" : ""} total</div>
    </div>
  );
}
