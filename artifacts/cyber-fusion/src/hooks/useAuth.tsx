import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: "admin" | "analyst" | "viewer";
  tenantId: number;
  tenantName: string;
  tenantTier: "trial" | "starter" | "professional" | "enterprise";
  isImpersonating?: boolean;
  impersonatorEmail?: string;
  impersonationExpiresAt?: number;
}

interface RegisterData {
  orgName: string;
  email: string;
  displayName: string;
  password: string;
  tier: string;
  licenseKey?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  exitImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? body?.message ?? `HTTP ${res.status}`);
  return body;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setUser(data.user);
  };

  const register = async (data: RegisterData) => {
    const result = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify(data) });
    setUser(result.user);
  };

  const logout = async () => {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  };

  const exitImpersonation = async () => {
    await apiFetch("/admin/impersonate/exit", { method: "POST" }).catch(() => {});
    setUser(null);
    window.location.href = import.meta.env.BASE_URL.replace(/\/$/, "") + "/admin";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, exitImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
