import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, TerminalSquare, Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

function ForcePasswordResetModal() {
  const { changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirm) { setError("Passwords do not match"); return; }
    setError(""); setLoading(true);
    try {
      await changePassword(null, newPassword);
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? "Failed to change password");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="bg-card border border-orange-500/40 p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-orange-500/10 border border-orange-500/30 shrink-0">
              <Lock className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <div className="text-xs font-mono text-orange-400/70 tracking-widest">SECURITY REQUIREMENT</div>
              <h2 className="text-lg font-bold tracking-wider">PASSWORD RESET REQUIRED</h2>
            </div>
          </div>
          <p className="text-xs font-mono text-muted-foreground">
            A platform administrator has required you to set a new password before continuing. Choose a strong password to secure your account.
          </p>
          {done ? (
            <div className="flex items-center gap-2 text-sm font-mono text-primary border border-primary/30 bg-primary/10 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Password updated. Redirecting...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-xs font-mono text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
                </div>
              )}
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1.5">NEW PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type={showPw ? "text" : "password"} required value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters"
                    className="w-full bg-background border border-border pl-9 pr-9 py-2.5 text-sm font-mono focus:outline-none focus:border-orange-400/60" />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1.5">CONFIRM PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type={showPw ? "text" : "password"} required value={confirm}
                    onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password"
                    className="w-full bg-background border border-border pl-9 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:border-orange-400/60" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-mono font-bold tracking-widest bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                SET NEW PASSWORD
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center bg-primary/10 border border-primary/40">
            <TerminalSquare className="h-6 w-6 text-primary" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            AUTHENTICATING...
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      {user.mustResetPassword && <ForcePasswordResetModal />}
      {children}
    </>
  );
}
