import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "./useAuth";

export interface ModuleLicense {
  moduleKey: string;
  enabled: boolean;
}

export const ALL_MODULES = [
  { key: "command_center",        label: "Command Center",        minTier: "trial"        },
  { key: "agent_fleet",           label: "Agent Fleet",           minTier: "trial"        },
  { key: "sprint_ops",            label: "Sprint Ops",            minTier: "starter"      },
  { key: "missions",              label: "Missions",              minTier: "starter"      },
  { key: "threat_intel",          label: "Threat Intel",          minTier: "starter"      },
  { key: "detection_eng",         label: "Detection Eng.",        minTier: "professional" },
  { key: "incidents",             label: "Incidents",             minTier: "professional" },
  { key: "event_log",             label: "Event Log",             minTier: "trial"        },
  { key: "adversarial_sim",       label: "Adversarial Sim",       minTier: "professional" },
  { key: "threat_hunting",        label: "Threat Hunting",        minTier: "professional" },
  { key: "ai_copilot",            label: "AI Copilot",            minTier: "starter"      },
  { key: "compliance",            label: "Compliance & GRC",      minTier: "enterprise"   },
  { key: "playbooks",             label: "Automated Playbooks",   minTier: "professional" },
  { key: "behavioral_analytics",  label: "Behavioral Analytics",  minTier: "enterprise"   },
  { key: "executive",             label: "Executive Dashboard",   minTier: "enterprise"   },
  { key: "early_warning",         label: "Predictive EWS",        minTier: "enterprise"   },
  { key: "license_admin",         label: "License Admin",         minTier: "enterprise"   },
] as const;

export type ModuleKey = typeof ALL_MODULES[number]["key"];

const TIER_RANK: Record<string, number> = {
  trial: 0, starter: 1, professional: 2, enterprise: 3,
};

interface LicenseContextValue {
  licenses: ModuleLicense[];
  loading: boolean;
  isEnabled: (key: ModuleKey) => boolean;
  toggle: (key: ModuleKey, enabled: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextValue | null>(null);

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
  return body;
}

export function LicenseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<ModuleLicense[]>([]);
  const [loading, setLoading] = useState(true);

  const tierRank = user ? (TIER_RANK[user.tenantTier] ?? 0) : 0;

  const refresh = useCallback(async () => {
    if (!user) { setLicenses([]); setLoading(false); return; }
    try {
      const data: ModuleLicense[] = await apiFetch("/licenses");
      setLicenses(data);
    } catch {
      setLicenses([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const isEnabled = useCallback((key: ModuleKey): boolean => {
    const mod = ALL_MODULES.find(m => m.key === key);
    if (!mod) return false;
    const modMinRank = TIER_RANK[mod.minTier] ?? 0;
    if (tierRank < modMinRank) return false;
    const lic = licenses.find(l => l.moduleKey === key);
    if (lic) return lic.enabled;
    return true;
  }, [licenses, tierRank]);

  const toggle = useCallback(async (key: ModuleKey, enabled: boolean) => {
    await apiFetch(`/licenses/${key}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
    await refresh();
  }, [refresh]);

  return (
    <LicenseContext.Provider value={{ licenses, loading, isEnabled, toggle, refresh }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicenses(): LicenseContextValue {
  const ctx = useContext(LicenseContext);
  if (!ctx) throw new Error("useLicenses must be inside <LicenseProvider>");
  return ctx;
}
