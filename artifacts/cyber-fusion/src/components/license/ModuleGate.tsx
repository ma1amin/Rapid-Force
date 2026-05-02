import { Lock, Package } from "lucide-react";
import { useLicenses, type ModuleKey, ALL_MODULES } from "@/hooks/useLicenses";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  moduleKey: ModuleKey;
  children: React.ReactNode;
}

const TIER_LABELS: Record<string, string> = {
  trial: "TRIAL", starter: "STARTER", professional: "PROFESSIONAL", enterprise: "ENTERPRISE",
};

export default function ModuleGate({ moduleKey, children }: Props) {
  const { isEnabled, loading } = useLicenses();
  const { user } = useAuth();

  if (loading) return null;

  if (isEnabled(moduleKey)) return <>{children}</>;

  const mod = ALL_MODULES.find(m => m.key === moduleKey);
  const requiredTier = mod?.minTier ?? "professional";
  const currentTier = user?.tenantTier ?? "trial";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center bg-muted border border-border">
        <Lock className="h-7 w-7 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-mono text-muted-foreground tracking-widest">MODULE LOCKED</div>
        <h2 className="text-xl font-bold tracking-wider">{mod?.label.toUpperCase() ?? moduleKey.toUpperCase()}</h2>
        <p className="text-sm text-muted-foreground font-mono max-w-sm">
          This module requires a{" "}
          <span className="text-primary font-bold">{TIER_LABELS[requiredTier]}</span> subscription or higher.
          Your current tier is{" "}
          <span className="text-accent font-bold">{TIER_LABELS[currentTier]}</span>.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="border border-border px-4 py-2 text-xs font-mono text-muted-foreground flex items-center gap-2">
          <Package className="h-3.5 w-3.5" />
          CURRENT: {TIER_LABELS[currentTier]}
        </div>
        <a
          href="/license-admin"
          className="border border-primary px-4 py-2 text-xs font-mono text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          UPGRADE SUBSCRIPTION →
        </a>
      </div>
    </div>
  );
}
