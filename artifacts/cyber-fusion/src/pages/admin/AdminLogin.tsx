import { useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAdminAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "linear-gradient(rgba(249,115,22,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.4) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-48 h-px bg-gradient-to-r from-orange-500/60 to-transparent" />
      <div className="absolute top-0 left-0 w-px h-48 bg-gradient-to-b from-orange-500/60 to-transparent" />
      <div className="absolute bottom-0 right-0 w-48 h-px bg-gradient-to-l from-orange-500/60 to-transparent" />
      <div className="absolute bottom-0 right-0 w-px h-48 bg-gradient-to-t from-orange-500/60 to-transparent" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center bg-orange-500/10 border border-orange-500/40 mb-4">
            <ShieldCheck className="h-7 w-7 text-orange-400" />
          </div>
          <div className="text-xl font-bold tracking-wider mb-1">RAPID FORCE</div>
          <div className="text-xs font-mono text-orange-400 tracking-widest">ADMIN PORTAL · RESTRICTED ACCESS</div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border p-6">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-5">PLATFORM ADMINISTRATOR LOGIN</div>

          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 px-3 py-2.5 mb-4 text-xs font-mono text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1.5 tracking-wider">ADMIN EMAIL</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@rapidforce.io"
                  className="w-full bg-background border border-border pl-9 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:border-orange-500/60 placeholder:text-muted-foreground/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1.5 tracking-wider">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-background border border-border pl-9 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:border-orange-500/60 placeholder:text-muted-foreground/50 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white font-bold text-sm tracking-wider py-2.5 hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "AUTHENTICATING..." : "ACCESS ADMIN PORTAL"}
            </button>
          </form>
        </div>

        <div className="text-center mt-4 text-xs font-mono text-muted-foreground/60">
          RAPID FORCE CYBER FUSION · PLATFORM ADMIN v1.0
        </div>
      </div>
    </div>
  );
}
