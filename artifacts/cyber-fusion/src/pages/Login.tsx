import { useState } from "react";
import { useLocation } from "wouter";
import { TerminalSquare, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      setLocation("/");
    } catch (err: any) {
      setError(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center relative overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex h-14 w-14 items-center justify-center bg-primary/10 border border-primary/40 mb-4">
            <TerminalSquare className="h-7 w-7 text-primary" />
          </div>
          <div className="text-xl font-bold tracking-widest text-foreground">RAPID FORCE</div>
          <div className="text-xs font-mono text-primary tracking-widest mt-1">CYBER FUSION PLATFORM</div>
          <div className="mt-2 text-xs font-mono text-muted-foreground">SECURE ACCESS TERMINAL</div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border p-8 space-y-6">
          <div className="text-xs font-mono text-muted-foreground tracking-widest">OPERATOR LOGIN</div>

          {error && (
            <div className="flex items-center gap-2 text-xs font-mono text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1.5">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full bg-background border border-border pl-9 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary transition-colors"
                  placeholder="operator@rapidforce.io"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1.5">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-background border border-border pl-9 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary transition-colors"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 text-sm font-mono font-bold tracking-widest transition-all",
                "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              )}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />AUTHENTICATING...</>
              ) : (
                "ACCESS PLATFORM"
              )}
            </button>
          </form>

          <div className="text-center text-xs font-mono text-muted-foreground">
            NO ACCOUNT?{" "}
            <button
              onClick={() => setLocation("/register")}
              className="text-primary hover:underline"
            >
              REGISTER YOUR ORGANIZATION
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs font-mono text-muted-foreground/50">
          RAPID FORCE CYBER FUSION v3.0 · UNAUTHORIZED ACCESS PROHIBITED
        </div>
      </div>
    </div>
  );
}
