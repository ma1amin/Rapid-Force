import { useState, useEffect, useCallback } from "react";
import { Radar, AlertTriangle, TrendingUp, Clock, Zap, Activity, Target, Brain, User, Shield, Phone, FileText, RefreshCcw, Loader2, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Prediction {
  id: number;
  title: string;
  threatCategory: string;
  description: string;
  probability: number;
  severity: string;
  timeframe: string;
  evidenceSignals: string[];
  recommendation: string;
  status: string;
  confidence: string;
  affectedAssets: number;
}

const ESCALATION_TARGETS = [
  { id: "ciso",  label: "CISO",              name: "Chief Information Security Officer", icon: Shield,   required: true,  description: "Always notified for critical escalations" },
  { id: "soc",   label: "SOC Lead",           name: "SOC Team Lead",                     icon: Radar,    required: true,  description: "Incident triage & response coordination" },
  { id: "ir",    label: "IR Team Lead",       name: "Incident Response Lead",            icon: Zap,      required: true,  description: "Active threat containment owner" },
  { id: "cto",   label: "CTO",                name: "Chief Technology Officer",          icon: Brain,    required: false, description: "Notified for infrastructure-impacting events" },
  { id: "legal", label: "Legal / Compliance", name: "General Counsel",                   icon: FileText, required: false, description: "Required for data breach or regulatory exposure" },
  { id: "comms", label: "Communications",     name: "PR / Communications Lead",          icon: Phone,    required: false, description: "For incidents with potential public disclosure" },
  { id: "exec",  label: "Executive Team",     name: "CEO + Board Notification",          icon: User,     required: false, description: "Board-level escalation for existential risk" },
];

const sevColors: Record<string, string> = {
  critical: "text-red-400 border-red-500/40 bg-red-500/10",
  high:     "text-orange-400 border-orange-500/40 bg-orange-500/10",
  medium:   "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
  low:      "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
};
const probColor = (p: number) => p >= 80 ? "text-red-400" : p >= 60 ? "text-orange-400" : p >= 40 ? "text-yellow-400" : "text-emerald-400";
const probBg    = (p: number) => p >= 80 ? "bg-red-500"  : p >= 60 ? "bg-orange-500"  : p >= 40 ? "bg-yellow-500"  : "bg-emerald-500";

export default function PredictiveEWS() {
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selected, setSelected]       = useState<Prediction | null>(null);
  const [loading, setLoading]         = useState(true);
  const [analyzing, setAnalyzing]     = useState(false);
  const [escalateOpen, setEscalateOpen]       = useState(false);
  const [escalateNotes, setEscalateNotes]     = useState("");
  const [escalateTargets, setEscalateTargets] = useState<Record<string, boolean>>({
    ciso: true, soc: true, ir: true, cto: false, legal: false, comms: false, exec: false,
  });

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/ews/predictions`, { credentials: "include" });
      if (r.ok) {
        const data: Prediction[] = await r.json();
        setPredictions(data);
        if (data.length > 0 && !selected) setSelected(data[0]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const r = await fetch(`${BASE}/api/ews/analyze`, { method: "POST", credentials: "include" });
      if (r.ok) {
        const newPred = await r.json();
        setPredictions(prev => [newPred, ...prev]);
        setSelected(newPred);
        toast({ title: "AI analysis complete", description: "New composite threat prediction generated from active signals." });
      } else {
        toast({ title: "Analysis failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Analysis failed", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  }

  async function dismissPrediction(id: number) {
    try {
      await fetch(`${BASE}/api/ews/predictions/${id}/status`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "false_positive" }),
      });
      setPredictions(prev => prev.filter(p => p.id !== id));
      if (selected?.id === id) setSelected(predictions.find(p => p.id !== id) ?? null);
      toast({ title: "Prediction dismissed" });
    } catch {
      toast({ title: "Failed to dismiss", variant: "destructive" });
    }
  }

  const critical = predictions.filter(s => s.severity === "critical").length;
  const high     = predictions.filter(s => s.severity === "high").length;
  const avgProb  = predictions.length > 0 ? Math.round(predictions.reduce((a, s) => a + s.probability, 0) / predictions.length) : 0;

  const selectedTargets = ESCALATION_TARGETS.filter(t => escalateTargets[t.id]);

  function handleEscalate() {
    const notified = selectedTargets.map(t => t.label).join(", ");
    setEscalateOpen(false);
    setEscalateNotes("");
    toast({
      title: "Escalation sent",
      description: `${critical} critical signal${critical > 1 ? "s" : ""} escalated to: ${notified}. Incident reference created.`,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-primary/70 tracking-widest mb-1">RAPID FORCE // PREDICTIVE EARLY WARNING</div>
          <h1 className="text-2xl font-bold tracking-wider">PREDICTIVE EARLY WARNING</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">AI threat forecasting · ML signal correlation · Pre-attack detection</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={runAnalysis} disabled={analyzing}
            className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-mono text-xs gap-2 h-8">
            {analyzing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />ANALYZING...</> : <><Brain className="w-3.5 h-3.5" />RUN AI ANALYSIS</>}
          </Button>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>EWS ENGINE ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Critical banner */}
      {!loading && critical > 0 && (
        <div className="bg-destructive/5 border border-destructive/40 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 animate-pulse" />
          <div className="text-xs font-mono text-destructive flex-1">
            <span className="font-bold">{critical} CRITICAL prediction signal{critical > 1 ? "s" : ""} active</span>
            {" — "} Immediate review and mitigation recommended.
          </div>
          <Button size="sm" onClick={() => setEscalateOpen(true)}
            className="bg-destructive/20 border border-destructive/40 text-destructive hover:bg-destructive/30 font-mono text-xs h-7 gap-1.5 flex-shrink-0">
            <AlertTriangle className="w-3 h-3" /> ESCALATE
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "ACTIVE PREDICTIONS", value: loading ? "—" : predictions.length, icon: Radar,        color: "text-primary"      },
          { label: "CRITICAL RISK",      value: loading ? "—" : critical,           icon: AlertTriangle, color: "text-destructive"  },
          { label: "HIGH RISK",          value: loading ? "—" : high,               icon: TrendingUp,    color: "text-accent"       },
          { label: "AVG PROBABILITY",    value: loading ? "—" : `${avgProb}%`,      icon: Brain,         color: "text-violet-400"   },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-mono tracking-wider">{s.label}</span>
              <s.icon className={cn("w-4 h-4", s.color)} />
            </div>
            <div className={cn("text-2xl font-bold font-mono", s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground font-mono text-xs">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading threat predictions...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Prediction list */}
          <div className="col-span-2 space-y-3">
            {predictions.map(sig => (
              <div key={sig.id} onClick={() => setSelected(sig)}
                className={cn("bg-card border p-4 cursor-pointer hover:border-primary/40 transition-all group",
                  selected?.id === sig.id ? "border-primary/60" : "border-border"
                )}>
                <div className="flex items-start gap-4">
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/50" />
                      <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4"
                        stroke={sig.probability >= 80 ? "#ef4444" : sig.probability >= 60 ? "#f97316" : sig.probability >= 40 ? "#eab308" : "#10b981"}
                        strokeDasharray={`${(sig.probability / 100) * 113.1} 113.1`} strokeLinecap="round" />
                    </svg>
                    <span className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold font-mono", probColor(sig.probability))}>
                      {sig.probability}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold font-mono">{sig.title}</span>
                      <Badge className={cn("text-[10px] font-mono border px-1.5 py-0", sevColors[sig.severity])}>{sig.severity.toUpperCase()}</Badge>
                      <Badge className="text-[10px] font-mono border border-border bg-muted/50 text-muted-foreground px-1.5 py-0">{sig.threatCategory}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono line-clamp-2">{sig.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs font-mono text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ETA: {sig.timeframe}</span>
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {sig.affectedAssets} assets</span>
                      <span>Confidence: {sig.confidence}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {predictions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-border gap-3">
                <CheckCircle className="w-8 h-8 text-emerald-400/30" />
                <p className="text-sm font-mono text-muted-foreground">No active threat predictions.</p>
                <button onClick={runAnalysis} className="text-xs font-mono text-primary hover:underline">Run AI analysis to generate predictions →</button>
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="bg-card border border-border p-5 sticky top-6">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold font-mono leading-tight">{selected.title}</h3>
                  </div>
                  <Badge className={cn("text-[10px] font-mono border px-1.5 py-0 mt-1", sevColors[selected.severity])}>
                    {selected.severity.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-center py-4 border border-border">
                  <div className={cn("text-5xl font-black font-mono", probColor(selected.probability))}>{selected.probability}%</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">ATTACK PROBABILITY</div>
                  <div className="w-3/4 mx-auto bg-muted rounded-full h-1.5 mt-2">
                    <div className={cn("h-1.5 rounded-full", probBg(selected.probability))} style={{ width: `${selected.probability}%` }} />
                  </div>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  {[
                    ["ETA", selected.timeframe],
                    ["Category", selected.threatCategory],
                    ["Confidence", selected.confidence],
                    ["Affected Assets", selected.affectedAssets],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-2 tracking-wider">CONTRIBUTING SIGNALS</div>
                  <div className="space-y-1.5">
                    {(selected.evidenceSignals ?? []).map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1.5">
                        <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" />{s}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-2 tracking-wider">AI RECOMMENDATION</div>
                  <div className="text-xs font-mono text-foreground/80 bg-primary/5 border border-primary/20 p-3 leading-relaxed">
                    {selected.recommendation}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button className="w-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-mono text-xs gap-2"
                    onClick={() => toast({ title: "Playbook triggered", description: `Response playbook for "${selected.title}" initiated.` })}>
                    <Zap className="w-3 h-3" /> TRIGGER RESPONSE PLAYBOOK
                  </Button>
                  {selected.severity === "critical" && (
                    <Button className="w-full bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 font-mono text-xs gap-2"
                      onClick={() => setEscalateOpen(true)}>
                      <AlertTriangle className="w-3 h-3" /> ESCALATE THIS SIGNAL
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full border border-border text-muted-foreground hover:text-foreground font-mono text-xs gap-2 h-8"
                    onClick={() => dismissPrediction(selected.id)}>
                    <CheckCircle className="w-3 h-3" /> MARK FALSE POSITIVE
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
                <Radar className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground font-mono">Select a signal to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Escalation Dialog */}
      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent className="bg-popover border border-destructive/30 text-popover-foreground max-w-lg font-mono">
          <DialogHeader>
            <DialogTitle className="text-destructive tracking-widest text-sm font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> ESCALATE CRITICAL SIGNALS
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="text-xs text-muted-foreground font-mono bg-destructive/5 border border-destructive/20 p-3">
              Escalating <span className="text-destructive font-bold">{critical} critical signal{critical > 1 ? "s" : ""}</span> will
              immediately notify the selected stakeholders via secure channel and create a formal incident record.
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground tracking-wider">NOTIFY STAKEHOLDERS</Label>
              <div className="space-y-2">
                {ESCALATION_TARGETS.map(t => (
                  <div key={t.id} className={cn(
                    "flex items-center gap-3 p-2.5 border transition-all",
                    escalateTargets[t.id] ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/20"
                  )}>
                    <Switch checked={escalateTargets[t.id]}
                      onCheckedChange={v => !t.required && setEscalateTargets(prev => ({ ...prev, [t.id]: v }))}
                      disabled={t.required} className="data-[state=checked]:bg-destructive" />
                    <t.icon className={cn("w-3.5 h-3.5 flex-shrink-0", escalateTargets[t.id] ? "text-destructive" : "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-mono font-semibold", escalateTargets[t.id] ? "text-foreground" : "text-muted-foreground")}>{t.label}</span>
                        {t.required && <span className="text-[9px] font-mono text-destructive border border-destructive/30 px-1 py-0.5">REQUIRED</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">{t.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground tracking-wider">ESCALATION NOTES (OPTIONAL)</Label>
              <Textarea value={escalateNotes} onChange={e => setEscalateNotes(e.target.value)}
                placeholder="Add context, initial assessment, or specific instructions..."
                className="bg-muted/60 border-border text-foreground placeholder:text-muted-foreground font-mono text-xs resize-none h-20" />
            </div>
            <div className="text-xs font-mono text-muted-foreground bg-muted/40 border border-border p-3">
              <span className="text-foreground">Will notify:</span>{" "}
              {selectedTargets.length > 0 ? selectedTargets.map(t => t.name).join(", ") : "No targets selected"}
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setEscalateOpen(false)} variant="ghost"
                className="flex-1 border border-border text-muted-foreground hover:text-foreground font-mono text-xs h-9">CANCEL</Button>
              <Button onClick={handleEscalate} disabled={selectedTargets.length === 0}
                className="flex-1 bg-destructive/20 border border-destructive/40 text-destructive hover:bg-destructive/30 font-mono text-xs h-9 gap-2 disabled:opacity-40">
                <AlertTriangle className="w-3.5 h-3.5" /> CONFIRM ESCALATION
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
