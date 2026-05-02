import { useState } from "react";
import { Key, Package, CheckCircle2, XCircle, Lock, Shield, Loader2, Building2 } from "lucide-react";
import { useLicenses, ALL_MODULES, type ModuleKey } from "@/hooks/useLicenses";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const TIER_STYLE: Record<string, string> = {
  trial:        "text-muted-foreground border-border",
  starter:      "text-primary border-primary/40 bg-primary/10",
  professional: "text-accent border-accent/40 bg-accent/10",
  enterprise:   "text-destructive border-destructive/40 bg-destructive/10",
};

const TIER_MODULES: Record<string, string[]> = {
  trial:        ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel"],
  starter:      ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel", "sprint_ops", "missions"],
  professional: ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel", "sprint_ops", "missions", "detection_eng", "incidents", "adversarial_sim", "threat_hunting"],
  enterprise:   ALL_MODULES.map(m => m.key),
};

const TIER_RANK: Record<string, number> = { trial: 0, starter: 1, professional: 2, enterprise: 3 };
const MIN_TIER_RANK: Record<string, number> = {};
ALL_MODULES.forEach(m => { MIN_TIER_RANK[m.key] = TIER_RANK[m.minTier] ?? 0; });

export default function LicenseAdmin() {
  const { user } = useAuth();
  const { licenses, isEnabled, toggle, loading } = useLicenses();
  const [toggling, setToggling] = useState<string | null>(null);

  const tier = user?.tenantTier ?? "trial";
  const tierRank = TIER_RANK[tier] ?? 0;

  const handleToggle = async (key: ModuleKey, current: boolean) => {
    setToggling(key);
    try {
      await toggle(key, !current);
    } catch {
    } finally {
      setToggling(null);
    }
  };

  const includedInTier = TIER_MODULES[tier] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // ADMINISTRATION</div>
          <h1 className="text-2xl font-bold tracking-wider">LICENSE MANAGEMENT</h1>
        </div>
        <span className={cn("text-xs font-mono border px-3 py-1.5", TIER_STYLE[tier])}>
          {tier.toUpperCase()} TIER
        </span>
      </div>

      {/* Org info */}
      <div className="bg-card border border-border p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-1">ORGANIZATION</div>
          <div className="flex items-center gap-2 font-medium">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {user?.tenantName ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-1">OPERATOR</div>
          <div className="font-medium">{user?.displayName ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-1">ROLE</div>
          <div className={cn("font-mono text-sm font-bold", user?.role === "admin" ? "text-primary" : "text-muted-foreground")}>
            {user?.role?.toUpperCase() ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-1">MODULES ACTIVE</div>
          <div className="font-mono text-sm font-bold text-primary">
            {loading ? "—" : ALL_MODULES.filter(m => isEnabled(m.key)).length} / {ALL_MODULES.length}
          </div>
        </div>
      </div>

      {/* Tier comparison */}
      <div>
        <div className="text-xs font-mono text-muted-foreground tracking-widest mb-3">SUBSCRIPTION TIERS</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["trial", "starter", "professional", "enterprise"].map(t => {
            const isActive = t === tier;
            const rank = TIER_RANK[t] ?? 0;
            const modCount = TIER_MODULES[t]?.length ?? 0;
            return (
              <div key={t} className={cn("border p-4 transition-all", isActive ? "border-primary bg-primary/5" : "border-border")}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-xs font-mono font-bold", isActive ? "text-primary" : "text-foreground")}>{t.toUpperCase()}</span>
                  {isActive && <span className="text-xs font-mono text-primary border border-primary/30 px-1.5">ACTIVE</span>}
                </div>
                <div className="text-2xl font-bold font-mono mb-1">
                  {rank === 0 ? "FREE" : rank === 1 ? "$99" : rank === 2 ? "$299" : "$999"}
                </div>
                <div className="text-xs text-muted-foreground">{modCount} modules</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Module table */}
      <div>
        <div className="text-xs font-mono text-muted-foreground tracking-widest mb-3">MODULE LICENSES</div>
        {loading ? (
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />LOADING LICENSES...
          </div>
        ) : (
          <div className="space-y-1.5">
            {ALL_MODULES.map(mod => {
              const enabled = isEnabled(mod.key);
              const modMinRank = MIN_TIER_RANK[mod.key] ?? 0;
              const tierLocked = tierRank < modMinRank;
              const isToggling = toggling === mod.key;
              const lic = licenses.find(l => l.moduleKey === mod.key);
              const adminDisabled = lic ? !lic.enabled : false;

              return (
                <div key={mod.key} className={cn("flex items-center gap-4 p-3.5 border transition-colors", enabled ? "bg-card border-border hover:border-primary/30" : "bg-muted/30 border-border/50")}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {tierLocked
                        ? <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        : enabled
                          ? <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                          : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      }
                      <span className={cn("text-sm font-medium", !enabled ? "text-muted-foreground" : "")}>{mod.label}</span>
                      <span className="text-xs font-mono border border-border px-1.5 py-0.5 text-muted-foreground">{mod.key}</span>
                    </div>
                    {tierLocked && (
                      <div className="text-xs font-mono text-muted-foreground mt-0.5 pl-5.5">
                        Requires <span className="text-accent">{mod.minTier.toUpperCase()}</span> tier
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {tierLocked ? (
                      <span className="text-xs font-mono text-muted-foreground border border-border px-2.5 py-1">TIER LOCKED</span>
                    ) : (
                      <>
                        <span className={cn("text-xs font-mono", enabled ? "text-primary" : "text-muted-foreground")}>
                          {enabled ? "ENABLED" : "DISABLED"}
                        </span>
                        <button
                          disabled={isToggling || user?.role !== "admin"}
                          onClick={() => handleToggle(mod.key, enabled)}
                          className={cn(
                            "relative h-6 w-11 rounded-full border transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed",
                            enabled ? "bg-primary border-primary" : "bg-muted border-border"
                          )}
                          title={user?.role !== "admin" ? "Admin role required" : undefined}
                        >
                          {isToggling
                            ? <Loader2 className="h-3 w-3 animate-spin absolute inset-0 m-auto text-primary-foreground" />
                            : <span className={cn("absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-all shadow-sm", enabled ? "left-[22px]" : "left-[2px]")} style={{ height: "18px", width: "18px" }} />
                          }
                        </button>
                        {enabled
                          ? <CheckCircle2 className="h-4 w-4 text-primary" />
                          : <XCircle     className="h-4 w-4 text-muted-foreground" />
                        }
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {user?.role !== "admin" && (
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border px-4 py-3">
          <Lock className="h-3.5 w-3.5" />
          Module toggles require ADMIN role. Contact your organization admin.
        </div>
      )}

      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border px-4 py-3 bg-muted/20">
        <Key className="h-3.5 w-3.5 shrink-0" />
        <span>To upgrade your subscription tier, contact <span className="text-primary">support@rapidforce.io</span> or provide a new license key.</span>
      </div>
    </div>
  );
}
