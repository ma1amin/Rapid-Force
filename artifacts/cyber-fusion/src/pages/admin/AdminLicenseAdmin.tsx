import { useEffect, useState, useCallback } from "react";
import {
  Key, Building2, Shield, Lock, CheckCircle2, XCircle,
  Loader2, ChevronRight, Search, RefreshCw, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TIERS = ["trial", "starter", "professional", "enterprise"] as const;
type Tier = typeof TIERS[number];

const TIER_PRICE: Record<Tier, string> = {
  trial: "FREE", starter: "$99/mo", professional: "$299/mo", enterprise: "$999/mo",
};

const TIER_STYLE: Record<Tier, { badge: string; ring: string; btn: string }> = {
  trial:        { badge: "text-muted-foreground border-border",                    ring: "border-border",          btn: "border-border text-muted-foreground hover:border-foreground/40" },
  starter:      { badge: "text-primary border-primary/40 bg-primary/5",            ring: "border-primary/50",      btn: "border-primary/40 text-primary hover:border-primary" },
  professional: { badge: "text-accent border-accent/40 bg-accent/5",               ring: "border-accent/50",       btn: "border-accent/40 text-accent hover:border-accent" },
  enterprise:   { badge: "text-destructive border-destructive/40 bg-destructive/5", ring: "border-destructive/50",  btn: "border-destructive/40 text-destructive hover:border-destructive" },
};

const TIER_MODULES: Record<Tier, string[]> = {
  trial:        ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel"],
  starter:      ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel", "sprint_ops", "missions"],
  professional: ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel", "sprint_ops", "missions", "detection_eng", "incidents", "adversarial_sim", "threat_hunting"],
  enterprise:   ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel", "sprint_ops", "missions", "detection_eng", "incidents", "adversarial_sim", "threat_hunting", "license_admin"],
};

const ALL_MODULES = [
  { key: "command_center",  label: "Command Center",   minTier: "trial" as Tier },
  { key: "agent_fleet",     label: "Agent Fleet",      minTier: "trial" as Tier },
  { key: "event_log",       label: "Event Log",        minTier: "trial" as Tier },
  { key: "ai_copilot",      label: "AI Copilot",       minTier: "trial" as Tier },
  { key: "threat_intel",    label: "Threat Intel",     minTier: "trial" as Tier },
  { key: "sprint_ops",      label: "Sprint Ops",       minTier: "starter" as Tier },
  { key: "missions",        label: "Missions",         minTier: "starter" as Tier },
  { key: "detection_eng",   label: "Detection Eng.",   minTier: "professional" as Tier },
  { key: "incidents",       label: "Incidents",        minTier: "professional" as Tier },
  { key: "adversarial_sim", label: "Adversarial Sim",  minTier: "professional" as Tier },
  { key: "threat_hunting",  label: "Threat Hunting",   minTier: "professional" as Tier },
  { key: "license_admin",   label: "License Admin",    minTier: "enterprise" as Tier },
];

const TIER_RANK: Record<string, number> = { trial: 0, starter: 1, professional: 2, enterprise: 3 };

interface Tenant {
  id: number; name: string; slug: string; tier: Tier;
  isActive: boolean; userCount: number; createdAt: string; trialEndsAt: string | null;
}
interface ModuleOverride { moduleKey: string; enabled: boolean; }

export default function AdminLicenseAdmin() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [modules, setModules] = useState<ModuleOverride[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [changingTier, setChangingTier] = useState(false);
  const [togglingModule, setTogglingModule] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoadingTenants(true);
    try {
      const r = await fetch(`${BASE}/api/admin/tenants`, { credentials: "include" });
      if (r.ok) setTenants(await r.json());
    } finally { setLoadingTenants(false); }
  }, []);

  const fetchDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    try {
      const r = await fetch(`${BASE}/api/admin/tenants/${id}`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        setSelectedTenant(d.tenant);
        setModules(d.modules ?? []);
      }
    } finally { setLoadingDetail(false); }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);
  useEffect(() => { if (selectedId != null) fetchDetail(selectedId); }, [selectedId, fetchDetail]);

  const changeTier = async (tier: Tier) => {
    if (!selectedTenant || changingTier) return;
    setChangingTier(true);
    try {
      const r = await fetch(`${BASE}/api/admin/tenants/${selectedTenant.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (r.ok) {
        await fetchDetail(selectedTenant.id);
        setTenants(prev => prev.map(t => t.id === selectedTenant.id ? { ...t, tier } : t));
      }
    } finally { setChangingTier(false); }
  };

  const toggleModule = async (moduleKey: string, currentEnabled: boolean) => {
    if (!selectedTenant || togglingModule) return;
    setTogglingModule(moduleKey);
    try {
      const r = await fetch(`${BASE}/api/admin/tenants/${selectedTenant.id}/modules/${moduleKey}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (r.ok) {
        setModules(prev => {
          const existing = prev.find(m => m.moduleKey === moduleKey);
          if (existing) return prev.map(m => m.moduleKey === moduleKey ? { ...m, enabled: !currentEnabled } : m);
          return [...prev, { moduleKey, enabled: !currentEnabled }];
        });
      }
    } finally { setTogglingModule(null); }
  };

  const getModuleEnabled = (moduleKey: string): boolean => {
    const override = modules.find(m => m.moduleKey === moduleKey);
    if (override) return override.enabled;
    return TIER_MODULES[selectedTenant?.tier ?? "trial"]?.includes(moduleKey) ?? false;
  };

  const tierRank = selectedTenant ? (TIER_RANK[selectedTenant.tier] ?? 0) : 0;

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-mono text-orange-400/70 tracking-widest mb-1">ADMIN PORTAL // LICENSE MANAGEMENT</div>
        <h1 className="text-2xl font-bold tracking-wider">LICENSE MANAGEMENT</h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">
          Manage subscription tiers and module access for all tenants
        </p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Tenant list */}
        <div className="w-72 shrink-0 flex flex-col border border-border bg-card">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tenants..."
                className="w-full bg-background border border-border pl-8 pr-3 py-1.5 text-xs font-mono focus:outline-none focus:border-orange-400/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingTenants ? (
              <div className="flex items-center justify-center h-24 text-xs font-mono text-muted-foreground gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />LOADING...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-xs font-mono text-muted-foreground py-10">No tenants found</div>
            ) : (
              filtered.map(t => {
                const isSelected = t.id === selectedId;
                const style = TIER_STYLE[t.tier];
                return (
                  <button key={t.id} onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "w-full text-left px-3 py-3 border-b border-border/50 transition-colors flex items-start gap-2",
                      isSelected ? "bg-orange-500/10 border-l-2 border-l-orange-400" : "hover:bg-sidebar-accent/40 border-l-2 border-l-transparent"
                    )}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn("text-xs font-mono font-bold", !t.isActive ? "text-muted-foreground line-through" : "text-foreground")}>{t.name}</span>
                        {!t.isActive && <span className="text-[9px] font-mono border border-destructive/40 text-destructive px-1">OFF</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-mono border px-1.5 py-0.5", style.badge)}>
                          {t.tier.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5">
                          <Users className="h-2.5 w-2.5" />{t.userCount}
                        </span>
                      </div>
                    </div>
                    {isSelected && <ChevronRight className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-border">
            <button onClick={fetchTenants} className="w-full flex items-center justify-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground py-1 transition-colors">
              <RefreshCw className="h-3 w-3" />REFRESH
            </button>
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto">
          {!selectedTenant ? (
            <div className="h-full flex items-center justify-center flex-col gap-3 text-muted-foreground border border-dashed border-border">
              <Key className="h-8 w-8 opacity-30" />
              <div className="text-xs font-mono">Select a tenant to manage licenses</div>
            </div>
          ) : loadingDetail ? (
            <div className="h-full flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />LOADING TENANT...
            </div>
          ) : (
            <div className="space-y-5">
              {/* Tenant header */}
              <div className="bg-card border border-border p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center bg-orange-500/10 border border-orange-500/30">
                      <Building2 className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <div className="font-bold tracking-wide">{selectedTenant.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">/{selectedTenant.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selectedTenant.isActive && (
                      <span className="text-xs font-mono border border-destructive/40 text-destructive px-2 py-0.5">SUSPENDED</span>
                    )}
                    <span className={cn("text-xs font-mono border px-2 py-0.5", TIER_STYLE[selectedTenant.tier].badge)}>
                      {selectedTenant.tier.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <div className="text-muted-foreground mb-0.5">CURRENT PLAN</div>
                    <div className="font-bold text-sm">{TIER_PRICE[selectedTenant.tier]}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-0.5">ACTIVE MODULES</div>
                    <div className="font-bold text-sm text-primary">
                      {ALL_MODULES.filter(m => getModuleEnabled(m.key)).length} / {ALL_MODULES.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-0.5">REGISTERED</div>
                    <div className="font-bold text-sm">{new Date(selectedTenant.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              {/* Tier selection */}
              <div>
                <div className="text-xs font-mono text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
                  SUBSCRIPTION TIER
                  {changingTier && <Loader2 className="h-3 w-3 animate-spin text-orange-400" />}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {TIERS.map(tier => {
                    const isActive = tier === selectedTenant.tier;
                    const style = TIER_STYLE[tier];
                    const moduleCount = TIER_MODULES[tier].length;
                    return (
                      <button key={tier} onClick={() => changeTier(tier)} disabled={changingTier}
                        className={cn(
                          "border p-4 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed",
                          isActive ? `${style.ring} bg-card` : "border-border hover:border-border/80 bg-card/50"
                        )}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn("text-xs font-mono font-bold", isActive ? style.badge.split(" ")[0] : "text-muted-foreground")}>
                            {tier.toUpperCase()}
                          </span>
                          {isActive && <span className="text-[9px] font-mono border border-orange-400/50 text-orange-400 px-1 py-0.5">ACTIVE</span>}
                        </div>
                        <div className="text-lg font-bold font-mono mb-0.5">{TIER_PRICE[tier]}</div>
                        <div className="text-[10px] text-muted-foreground">{moduleCount} modules</div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground mt-2">
                  Changing the tier automatically resets all module overrides to that tier's defaults.
                </p>
              </div>

              {/* Module grid */}
              <div>
                <div className="text-xs font-mono text-muted-foreground tracking-widest mb-3">
                  MODULE OVERRIDES
                </div>
                <div className="space-y-1.5">
                  {ALL_MODULES.map(mod => {
                    const enabled = getModuleEnabled(mod.key);
                    const minRank = TIER_RANK[mod.minTier] ?? 0;
                    const tierLocked = tierRank < minRank;
                    const override = modules.find(m => m.moduleKey === mod.key);
                    const isDefaultForTier = TIER_MODULES[selectedTenant.tier]?.includes(mod.key) ?? false;
                    const hasOverride = override !== undefined && override.enabled !== isDefaultForTier;
                    const isToggling = togglingModule === mod.key;

                    return (
                      <div key={mod.key} className={cn(
                        "flex items-center gap-4 px-4 py-3 border transition-colors",
                        enabled ? "bg-card border-border" : "bg-muted/20 border-border/40"
                      )}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {tierLocked
                              ? <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                              : enabled
                                ? <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                                : <XCircle className="h-3.5 w-3.5 text-destructive/50 shrink-0" />
                            }
                            <span className={cn("text-sm font-medium", !enabled ? "text-muted-foreground" : "")}>{mod.label}</span>
                            <span className="text-[10px] font-mono border border-border px-1.5 py-0.5 text-muted-foreground/70">{mod.key}</span>
                            {hasOverride && (
                              <span className="text-[10px] font-mono border border-orange-400/40 text-orange-400 px-1.5 py-0.5">OVERRIDE</span>
                            )}
                          </div>
                          {tierLocked && (
                            <div className="text-[10px] font-mono text-muted-foreground mt-0.5 pl-5">
                              Requires <span className="text-accent">{mod.minTier.toUpperCase()}</span> tier or higher
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={cn("text-xs font-mono w-16 text-right", enabled ? "text-primary" : "text-muted-foreground/50")}>
                            {enabled ? "ENABLED" : "DISABLED"}
                          </span>
                          <button
                            disabled={isToggling}
                            onClick={() => toggleModule(mod.key, enabled)}
                            className={cn(
                              "relative h-6 w-11 border transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
                              enabled ? "bg-primary border-primary" : "bg-muted border-border"
                            )}
                            title="Toggle module access"
                          >
                            {isToggling
                              ? <Loader2 className="h-3 w-3 animate-spin absolute inset-0 m-auto text-background" />
                              : <span className={cn("absolute top-0.5 transition-all bg-white shadow-sm", enabled ? "left-[22px]" : "left-[2px]")}
                                  style={{ height: "18px", width: "18px" }} />
                            }
                          </button>
                          {enabled
                            ? <CheckCircle2 className="h-4 w-4 text-primary" />
                            : <XCircle     className="h-4 w-4 text-muted-foreground/40" />
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 mt-3 text-[10px] font-mono text-muted-foreground border border-border/50 px-3 py-2 bg-muted/10">
                  <Key className="h-3 w-3 shrink-0" />
                  Module toggles override the tier defaults. <span className="text-orange-400">OVERRIDE</span> badge indicates a manual change from tier defaults.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
