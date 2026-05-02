import { useState } from "react";
import { useLocation } from "wouter";
import { TerminalSquare, Lock, Mail, Building2, User, Key, AlertCircle, Loader2, CheckCircle2, Tag, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const TIERS = [
  { id: "trial",        label: "TRIAL",        desc: "5 modules · 1 user · 14 days"       },
  { id: "starter",      label: "STARTER",      desc: "6 modules · 5 users · $99/mo"        },
  { id: "professional", label: "PROFESSIONAL", desc: "9 modules · 25 users · $299/mo"      },
  { id: "enterprise",   label: "ENTERPRISE",   desc: "All modules · Unlimited · $999/mo"   },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Register() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    orgName: "", email: "", displayName: "", password: "",
    confirmPassword: "", tier: "trial", licenseKey: "", voucherCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [voucherStatus, setVoucherStatus] = useState<{
    validating: boolean; valid?: boolean; message?: string; discountType?: string; discountValue?: number;
  }>({ validating: false });

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError("");
    setStep(2);
  };

  const validateVoucher = async (code: string) => {
    if (!code.trim()) { setVoucherStatus({ validating: false }); return; }
    setVoucherStatus({ validating: true });
    try {
      const r = await fetch(`${BASE}/api/vouchers/validate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), tier: form.tier }),
      });
      const data = await r.json();
      if (r.ok) {
        setVoucherStatus({
          validating: false, valid: true,
          message: data.description ?? "Voucher applied!",
          discountType: data.discountType, discountValue: data.discountValue,
        });
      } else {
        setVoucherStatus({ validating: false, valid: false, message: data.error });
      }
    } catch {
      setVoucherStatus({ validating: false, valid: false, message: "Validation failed" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (voucherStatus.valid === false) { setError("Please fix the voucher code or clear it"); return; }
    setError("");
    setLoading(true);
    try {
      await register({
        orgName: form.orgName, email: form.email, displayName: form.displayName,
        password: form.password, tier: form.tier,
        licenseKey: form.licenseKey || undefined,
        voucherCode: form.voucherCode || undefined,
      });
      setLocation("/");
    } catch (err: any) {
      setError(err?.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center relative overflow-hidden py-8">
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center bg-primary/10 border border-primary/40 mb-3">
            <TerminalSquare className="h-6 w-6 text-primary" />
          </div>
          <div className="text-lg font-bold tracking-widest text-foreground">RAPID FORCE</div>
          <div className="text-xs font-mono text-primary tracking-widest mt-1">CYBER FUSION PLATFORM</div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className={cn("flex items-center gap-2 flex-1", s < step ? "opacity-60" : "")}>
              <div className={cn("h-6 w-6 flex items-center justify-center text-xs font-mono font-bold border shrink-0",
                s === step ? "border-primary text-primary bg-primary/10" : s < step ? "border-primary/40 bg-primary/5" : "border-border text-muted-foreground")}>
                {s < step ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : s}
              </div>
              <span className="text-xs font-mono text-muted-foreground">{s === 1 ? "ACCOUNT" : "ORGANIZATION"}</span>
              {s < 2 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border p-8 space-y-5">
          <div className="text-xs font-mono text-muted-foreground tracking-widest">
            {step === 1 ? "CREATE OPERATOR ACCOUNT" : "CONFIGURE ORGANIZATION"}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs font-mono text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1.5">DISPLAY NAME</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type="text" required className="w-full bg-background border border-border pl-9 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary" placeholder="John Doe" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1.5">EMAIL ADDRESS</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type="email" required autoComplete="email" className="w-full bg-background border border-border pl-9 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary" placeholder="operator@org.io" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1.5">PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type="password" required className="w-full bg-background border border-border pl-9 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary" placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1.5">CONFIRM PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type="password" required className="w-full bg-background border border-border pl-9 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary" placeholder="Repeat password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 text-sm font-mono font-bold tracking-widest bg-primary text-primary-foreground hover:opacity-90">
                CONTINUE →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1.5">ORGANIZATION NAME</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type="text" required className="w-full bg-background border border-border pl-9 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary" placeholder="Acme Security Corp" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-2">SUBSCRIPTION TIER</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIERS.map((t) => (
                    <button key={t.id} type="button" onClick={() => setForm({ ...form, tier: t.id })}
                      className={cn("border p-2.5 text-left transition-colors",
                        form.tier === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground")}>
                      <div className="text-xs font-mono font-bold">{t.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voucher code */}
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1.5">
                  VOUCHER CODE <span className="text-muted-foreground/50">(OPTIONAL)</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type="text"
                    className={cn("w-full bg-background border pl-9 pr-9 py-2.5 text-sm font-mono focus:outline-none uppercase",
                      voucherStatus.valid === true ? "border-primary focus:border-primary" :
                      voucherStatus.valid === false ? "border-destructive focus:border-destructive" :
                      "border-border focus:border-primary"
                    )}
                    placeholder="SAVE20OFF"
                    value={form.voucherCode}
                    onChange={(e) => { setForm({ ...form, voucherCode: e.target.value.toUpperCase() }); setVoucherStatus({ validating: false }); }}
                    onBlur={(e) => validateVoucher(e.target.value)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {voucherStatus.validating && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    {voucherStatus.valid === true && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    {voucherStatus.valid === false && !voucherStatus.validating && (
                      <button type="button" onClick={() => { setForm({ ...form, voucherCode: "" }); setVoucherStatus({ validating: false }); }}>
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
                {voucherStatus.valid === true && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs font-mono text-primary">
                    <CheckCircle2 className="h-3 w-3" />
                    {voucherStatus.message ?? "Voucher applied"}{" "}
                    {voucherStatus.discountValue && `— ${voucherStatus.discountType === "percent" ? `${voucherStatus.discountValue}% off` : `$${voucherStatus.discountValue} off`}`}
                  </div>
                )}
                {voucherStatus.valid === false && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs font-mono text-destructive">
                    <AlertCircle className="h-3 w-3" />{voucherStatus.message}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1.5">
                  LICENSE KEY <span className="text-muted-foreground/50">(OPTIONAL)</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type="text" className="w-full bg-background border border-border pl-9 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary" placeholder="RFCF-XXXX-XXXX-XXXX" value={form.licenseKey} onChange={(e) => setForm({ ...form, licenseKey: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 border border-border text-xs font-mono text-muted-foreground hover:text-foreground">← BACK</button>
                <button type="submit" disabled={loading}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-mono font-bold tracking-widest bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50")}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />DEPLOYING...</> : "DEPLOY PLATFORM"}
                </button>
              </div>
            </form>
          )}

          <div className="text-center text-xs font-mono text-muted-foreground">
            HAVE AN ACCOUNT?{" "}
            <button onClick={() => setLocation("/login")} className="text-primary hover:underline">SIGN IN</button>
          </div>
        </div>
      </div>
    </div>
  );
}
