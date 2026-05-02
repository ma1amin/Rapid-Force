import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  Building2, ChevronLeft, Shield, XCircle, Lock, CheckCircle2,
  KeyRound, Loader2, Users, Copy, Check, AlertTriangle, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tenant {
  id: number; name: string; slug: string;
  tier: "trial" | "starter" | "professional" | "enterprise";
  licenseKey: string; isActive: boolean; trialEndsAt: string | null;
  createdAt: string; updatedAt: string;
}
interface TenantUser {
  id: number; email: string; displayName: string;
  role: "admin" | "analyst" | "viewer";
  isActive: boolean; lastLoginAt: string | null; createdAt: string;
}
interface Module { moduleKey: string; enabled: boolean }

const TIER_STYLE: Record<string, string> = {
  trial: "text-muted-foreground border-border",
  starter: "text-primary border-primary/40 bg-primary/5",
  professional: "text-accent border-accent/40 bg-accent/5",
  enterprise: "text-orange-400 border-orange-400/40 bg-orange-400/5",
};

const MODULE_LABELS: Record<string, string> = {
  command_center: "Command Center", agent_fleet: "Agent Fleet", sprint_ops: "Sprint Ops",
  missions: "Missions", threat_intel: "Threat Intel", detection_eng: "Detection Eng.",
  incidents: "Incidents", event_log: "Event Log", adversarial_sim: "Adversarial Sim",
  threat_hunting: "Threat Hunting", ai_copilot: "AI Copilot", license_admin: "License Admin",
};

const TIERS = ["trial", "starter", "professional", "enterprise"] as const;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="ml-2 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function AdminTenantDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const [data, setData] = useState<{ tenant: Tenant; users: TenantUser[]; modules: Module[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTier, setNewTier] = useState<string>("");
  const [savingTier, setSavingTier] = useState(false);
  const [togglingModule, setTogglingModule] = useState<string | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [impersonateLoading, setImpersonateLoading] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState("");
  const [savingTrial, setSavingTrial] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/tenants/${id}`, { credentials: "include" });
      const d = await r.json();
      setData(d);
      setNewTier(d.tenant.tier);
      setTrialEndDate(d.tenant.trialEndsAt ? new Date(d.tenant.trialEndsAt).toISOString().split("T")[0] : "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const applyTier = async () => {
    if (!data || newTier === data.tenant.tier) return;
    setSavingTier(true);
    try {
      await fetch(`${BASE}/api/admin/tenants/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: newTier }),
      });
      await fetchData();
    } finally { setSavingTier(false); }
  };

  const toggleSuspend = async () => {
    if (!data) return;
    setSuspendLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/tenants/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !data.tenant.isActive }),
      });
      const updated = await r.json();
      setData((prev) => prev ? { ...prev, tenant: { ...prev.tenant, isActive: updated.isActive } } : prev);
    } finally { setSuspendLoading(false); }
  };

  const regenKey = async () => {
    setRegenLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/tenants/${id}/regen-key`, { method: "POST", credentials: "include" });
      const updated = await r.json();
      setData((prev) => prev ? { ...prev, tenant: { ...prev.tenant, licenseKey: updated.licenseKey } } : prev);
    } finally { setRegenLoading(false); }
  };

  const setTrialExpiry = async () => {
    if (!data) return;
    setSavingTrial(true);
    try {
      await fetch(`${BASE}/api/admin/tenants/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trialEndsAt: trialEndDate || null }),
      });
      await fetchData();
    } finally { setSavingTrial(false); }
  };

  const startImpersonation = async () => {
    if (!data) return;
    setImpersonateLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/tenants/${id}/impersonate`, { method: "POST", credentials: "include" });
      if (r.ok) {
        navigate("/");
      } else {
        const err = await r.json();
        alert(err.error ?? "Impersonation failed");
      }
    } finally { setImpersonateLoading(false); }
  };

  const toggleModule = async (moduleKey: string, current: boolean) => {
    setTogglingModule(moduleKey);
    try {
      await fetch(`${BASE}/api/admin/tenants/${id}/modules/${moduleKey}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !current }),
      });
      setData((prev) => prev
        ? { ...prev, modules: prev.modules.map((m) => m.moduleKey === moduleKey ? { ...m, enabled: !current } : m) }
        : prev
      );
    } finally { setTogglingModule(null); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-xs font-mono text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />LOADING...
      </div>
    );
  }

  if (!data) return <div className="text-xs font-mono text-destructive">Tenant not found.</div>;

  const { tenant, users, modules } = data;
  const isTrialExpired = tenant.tier === "trial" && tenant.trialEndsAt && new Date(tenant.trialEndsAt) < new Date();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <Link href="/admin" className="hover:text-orange-300 transition-colors">ADMIN</Link>
        <span>/</span>
        <Link href="/admin/tenants" className="hover:text-orange-300 transition-colors">TENANTS</Link>
        <span>/</span>
        <span className="text-foreground">{tenant.name.toUpperCase()}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center bg-orange-400/10 border border-orange-400/20 text-xl font-bold text-orange-300">
            {tenant.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wider">{tenant.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={cn("text-xs font-mono border px-2 py-0.5", TIER_STYLE[tenant.tier])}>
                {tenant.tier.toUpperCase()}
              </span>
              {tenant.isActive
                ? <span className="flex items-center gap-1 text-xs font-mono text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />ACTIVE</span>
                : <span className="flex items-center gap-1 text-xs font-mono text-destructive"><span className="h-1.5 w-1.5 rounded-full bg-destructive" />SUSPENDED</span>
              }
              {isTrialExpired && (
                <span className="flex items-center gap-1 text-xs font-mono text-orange-400 border border-orange-400/40 px-2 py-0.5">
                  <AlertTriangle className="h-3 w-3" />TRIAL EXPIRED
                </span>
              )}
            </div>
          </div>
        </div>
        <Link href="/admin/tenants" className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-orange-300 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" />BACK
        </Link>
      </div>

      {/* Impersonation card */}
      <div className="border border-orange-500/30 bg-orange-500/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <EyeOff className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-300">Tenant Impersonation</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              Browse this tenant's portal as their admin user. Sensitive data is masked.
              Session expires in 30 minutes. All actions are logged to the audit trail.
            </p>
          </div>
          <button
            onClick={startImpersonation}
            disabled={impersonateLoading || !tenant.isActive}
            title={!tenant.isActive ? "Cannot impersonate suspended tenant" : undefined}
            className="flex items-center gap-2 text-xs font-mono bg-orange-500/20 border border-orange-500/50 text-orange-300 px-4 py-2.5 hover:bg-orange-500/30 transition-colors disabled:opacity-40 shrink-0"
          >
            {impersonateLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
            IMPERSONATE
          </button>
        </div>
      </div>

      {/* Info + actions grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Org info */}
        <div className="bg-card border border-border p-5 space-y-4">
          <div className="text-xs font-mono text-muted-foreground tracking-widest">ORGANIZATION INFO</div>
          {[
            { label: "ORG NAME", value: tenant.name },
            { label: "SLUG", value: tenant.slug },
            { label: "REGISTERED", value: new Date(tenant.createdAt).toLocaleString() },
            { label: "USERS", value: users.length.toString() },
            { label: "MODULES ACTIVE", value: `${modules.filter((m) => m.enabled).length} / ${modules.length}` },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">{row.label}</span>
              <span className="text-sm font-mono">{row.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">LICENSE KEY</span>
            <div className="flex items-center text-xs font-mono">{tenant.licenseKey}<CopyText text={tenant.licenseKey} /></div>
          </div>
        </div>

        {/* Admin controls */}
        <div className="bg-card border border-border p-5 space-y-4">
          <div className="text-xs font-mono text-muted-foreground tracking-widest">ADMIN CONTROLS</div>

          {/* Tier change */}
          <div>
            <div className="text-xs font-mono text-muted-foreground mb-2">CHANGE SUBSCRIPTION TIER</div>
            <div className="flex gap-2">
              <select value={newTier} onChange={(e) => setNewTier(e.target.value)}
                className="flex-1 bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50">
                {TIERS.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
              <button onClick={applyTier} disabled={savingTier || newTier === tenant.tier}
                className="flex items-center gap-1.5 text-xs font-mono bg-orange-500 text-white px-4 py-2 hover:bg-orange-600 transition-colors disabled:opacity-40">
                {savingTier && <Loader2 className="h-3 w-3 animate-spin" />}APPLY
              </button>
            </div>
            {newTier !== tenant.tier && (
              <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-orange-300">
                <AlertTriangle className="h-3 w-3" />This resets module access to {newTier} defaults.
              </div>
            )}
          </div>

          {/* Trial expiry (trial tier only) */}
          {tenant.tier === "trial" && (
            <div>
              <div className="text-xs font-mono text-muted-foreground mb-2">TRIAL EXPIRY DATE</div>
              <div className="flex gap-2">
                <input type="date" value={trialEndDate} onChange={(e) => setTrialEndDate(e.target.value)}
                  className="flex-1 bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/50" />
                <button onClick={setTrialExpiry} disabled={savingTrial}
                  className="flex items-center gap-1.5 text-xs font-mono border border-orange-400/40 text-orange-300 px-3 py-2 hover:bg-orange-400/10 transition-colors disabled:opacity-40">
                  {savingTrial && <Loader2 className="h-3 w-3 animate-spin" />}SET
                </button>
                {trialEndDate && (
                  <button onClick={() => { setTrialEndDate(""); }} className="text-xs font-mono text-muted-foreground hover:text-destructive px-2">×</button>
                )}
              </div>
              {isTrialExpired && (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-orange-400">
                  <AlertTriangle className="h-3 w-3" />Trial expired — tenant auto-suspended on next login.
                </div>
              )}
            </div>
          )}

          {/* Regen key */}
          <div>
            <div className="text-xs font-mono text-muted-foreground mb-2">LICENSE KEY</div>
            <button onClick={regenKey} disabled={regenLoading}
              className="flex items-center gap-2 text-xs font-mono border border-orange-400/40 text-orange-300 px-3 py-2 hover:bg-orange-400/10 transition-colors disabled:opacity-40">
              {regenLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />}REGENERATE LICENSE KEY
            </button>
          </div>

          {/* Danger zone */}
          <div>
            <div className="text-xs font-mono text-muted-foreground mb-2">DANGER ZONE</div>
            <button onClick={toggleSuspend} disabled={suspendLoading}
              className={cn("flex items-center gap-2 text-xs font-mono border px-3 py-2 transition-colors disabled:opacity-40",
                tenant.isActive
                  ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                  : "border-primary/40 text-primary hover:bg-primary/10"
              )}>
              {suspendLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : tenant.isActive ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {tenant.isActive ? "SUSPEND ORGANIZATION" : "ACTIVATE ORGANIZATION"}
            </button>
          </div>
        </div>
      </div>

      {/* Module licenses */}
      <div className="bg-card border border-border">
        <div className="px-5 py-3 border-b border-border text-xs font-mono text-muted-foreground tracking-widest">
          MODULE LICENSES — OVERRIDE
        </div>
        <div className="divide-y divide-border">
          {modules.map((mod) => {
            const isToggling = togglingModule === mod.moduleKey;
            return (
              <div key={mod.moduleKey} className={cn("flex items-center gap-4 px-5 py-3", !mod.enabled && "opacity-60")}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {mod.enabled ? <Shield className="h-3.5 w-3.5 text-primary shrink-0" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <span className="text-sm font-medium">{MODULE_LABELS[mod.moduleKey] ?? mod.moduleKey}</span>
                    <span className="text-xs font-mono border border-border px-1.5 py-0.5 text-muted-foreground">{mod.moduleKey}</span>
                  </div>
                </div>
                <span className={cn("text-xs font-mono", mod.enabled ? "text-primary" : "text-muted-foreground")}>
                  {mod.enabled ? "ENABLED" : "DISABLED"}
                </span>
                <button disabled={isToggling} onClick={() => toggleModule(mod.moduleKey, mod.enabled)}
                  className={cn("relative h-6 w-11 rounded-full border transition-colors focus:outline-none disabled:opacity-40",
                    mod.enabled ? "bg-primary border-primary" : "bg-muted border-border")}>
                  {isToggling
                    ? <Loader2 className="h-3 w-3 animate-spin absolute inset-0 m-auto text-white" />
                    : <span className={cn("absolute top-0.5 rounded-full bg-white shadow-sm transition-all", mod.enabled ? "left-[22px]" : "left-[2px]")} style={{ height: "18px", width: "18px" }} />
                  }
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Users */}
      <div className="bg-card border border-border">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div className="text-xs font-mono text-muted-foreground tracking-widest">USERS ({users.length})</div>
        </div>
        {users.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-muted-foreground">No users in this organization.</div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className={cn("flex items-center gap-4 px-5 py-3", !u.isActive && "opacity-50")}>
                <div className="flex h-7 w-7 items-center justify-center bg-primary/10 border border-primary/20 text-xs font-bold text-primary shrink-0">
                  {u.displayName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{u.displayName}</div>
                  <div className="text-xs font-mono text-muted-foreground truncate">{u.email}</div>
                </div>
                <span className={cn("text-xs font-mono border px-2 py-0.5 shrink-0",
                  u.role === "admin" ? "text-primary border-primary/40" :
                  u.role === "analyst" ? "text-accent border-accent/40" : "text-muted-foreground border-border")}>
                  {u.role.toUpperCase()}
                </span>
                <div className="text-xs font-mono text-muted-foreground shrink-0">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                </div>
                {u.isActive ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
