import { useEffect, useState } from "react";
import { Plus, Megaphone, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Announcement {
  id: number; title: string; body: string; type: string;
  isActive: boolean; expiresAt: string | null; createdAt: string;
}

const TYPE_STYLE: Record<string, { badge: string; bg: string; dot: string }> = {
  info:     { badge: "text-primary border-primary/40 bg-primary/5",         bg: "border-primary/20 bg-primary/3",         dot: "bg-primary" },
  warning:  { badge: "text-yellow-400 border-yellow-400/40 bg-yellow-400/5", bg: "border-yellow-500/20 bg-yellow-400/3",   dot: "bg-yellow-400" },
  critical: { badge: "text-destructive border-destructive/40 bg-destructive/5", bg: "border-destructive/20 bg-destructive/3", dot: "bg-destructive" },
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", body: "", type: "info", expiresAt: "" });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/announcements`, { credentials: "include" });
      setItems(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/admin/announcements`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expiresAt: form.expiresAt || null }),
      });
      if (!r.ok) { const err = await r.json(); alert(err.error ?? "Failed"); return; }
      await fetchItems();
      setShowCreate(false);
      setForm({ title: "", body: "", type: "info", expiresAt: "" });
    } finally { setSaving(false); }
  };

  const toggleActive = async (a: Announcement) => {
    await fetch(`${BASE}/api/admin/announcements/${a.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !a.isActive }),
    });
    setItems((prev) => prev.map((x) => x.id === a.id ? { ...x, isActive: !x.isActive } : x));
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    setDeletingId(id);
    try {
      await fetch(`${BASE}/api/admin/announcements/${id}`, { method: "DELETE", credentials: "include" });
      setItems((prev) => prev.filter((x) => x.id !== id));
    } finally { setDeletingId(null); }
  };

  const activeCount = items.filter((a) => a.isActive && (!a.expiresAt || new Date(a.expiresAt) > new Date())).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-orange-400/70 tracking-widest mb-1">ADMIN PORTAL // ANNOUNCEMENTS</div>
          <h1 className="text-2xl font-bold tracking-wider">PLATFORM ANNOUNCEMENTS</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Broadcast messages shown to all tenant portal users
          </p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-mono border border-orange-400/50 text-orange-300 bg-orange-500/10 px-3 py-1.5 hover:bg-orange-500/20 transition-colors">
          <Plus className="h-3.5 w-3.5" />NEW ANNOUNCEMENT
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "TOTAL", value: items.length },
          { label: "CURRENTLY LIVE", value: activeCount },
          { label: "CRITICAL ACTIVE", value: items.filter((a) => a.type === "critical" && a.isActive).length },
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
          <div className="text-xs font-mono text-orange-400/70 tracking-widest mb-4">NEW ANNOUNCEMENT</div>
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1.5">TITLE *</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Scheduled maintenance window" maxLength={100}
                  className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50" />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1.5">TYPE</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50">
                  <option value="info">INFO</option>
                  <option value="warning">WARNING</option>
                  <option value="critical">CRITICAL</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1.5">MESSAGE *</label>
              <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={3} maxLength={1000} placeholder="Describe the announcement..."
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50 resize-none" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1.5">EXPIRES AT (optional)</label>
              <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 text-xs font-mono bg-orange-500 text-white px-4 py-2 hover:bg-orange-600 transition-colors disabled:opacity-50">
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}PUBLISH
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="text-xs font-mono border border-border text-muted-foreground px-4 py-2 hover:text-foreground transition-colors">
                CANCEL
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements list */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-card border border-border animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="bg-card border border-border py-12 text-center text-xs font-mono text-muted-foreground">
            No announcements yet. Create one to broadcast to all tenant users.
          </div>
        ) : (
          items.map((a) => {
            const style = TYPE_STYLE[a.type] ?? TYPE_STYLE.info;
            const expired = a.expiresAt && new Date(a.expiresAt) < new Date();
            return (
              <div key={a.id} className={cn("border p-4", !a.isActive || expired ? "opacity-50 border-border bg-card" : style.bg)}>
                <div className="flex items-start gap-3">
                  <span className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", style.dot, a.isActive && !expired ? "animate-pulse" : "")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span className="text-sm font-semibold">{a.title}</span>
                      <span className={cn("text-[10px] font-mono border px-1.5 py-0.5", style.badge)}>{a.type.toUpperCase()}</span>
                      {!a.isActive && <span className="text-[10px] font-mono border border-border text-muted-foreground px-1.5 py-0.5">INACTIVE</span>}
                      {expired && <span className="text-[10px] font-mono border border-destructive/40 text-destructive px-1.5 py-0.5">EXPIRED</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{a.body}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs font-mono text-muted-foreground">
                      <span>Created {new Date(a.createdAt).toLocaleDateString()}</span>
                      {a.expiresAt && <span>Expires {new Date(a.expiresAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleActive(a)} title={a.isActive ? "Deactivate" : "Activate"}
                      className="text-muted-foreground hover:text-orange-300 transition-colors">
                      {a.isActive ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button onClick={() => deleteItem(a.id)} disabled={deletingId === a.id}
                      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40">
                      {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
