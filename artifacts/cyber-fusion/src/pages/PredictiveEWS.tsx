import { useState } from "react";
import { Radar, AlertTriangle, TrendingUp, Clock, Shield, Zap, Eye, ChevronRight, Activity, Target, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const MOCK_SIGNALS = [
  {
    id: "ews-001",
    title: "Ransomware Campaign Probability Surge",
    description: "ML models detect a 340% increase in pre-ransomware indicators across tenant assets — consistent with Cl0p & LockBit TTP signatures observed in threat intel feeds over the past 48h.",
    probability: 87,
    severity: "critical",
    eta: "24–72 hours",
    category: "Ransomware",
    signals: ["Lateral movement spikes (+340%)", "Credential harvesting tools detected", "C2 beaconing to known LockBit infrastructure", "Shadow copy deletion attempts"],
    recommendation: "Immediately isolate high-value assets, enforce least-privilege, review backup integrity, and pre-stage IR team.",
    confidence: "High",
    affectedAssets: 34,
  },
  {
    id: "ews-002",
    title: "Insider Threat Escalation Risk",
    description: "UEBA models flagged three users with combined risk scores exceeding threshold. Correlated with recent HR activity and access pattern changes suggesting potential data exfiltration precursors.",
    probability: 73,
    severity: "high",
    eta: "3–7 days",
    category: "Insider Threat",
    signals: ["Unusual after-hours access (3 users)", "PII export volume increase +280%", "New USB registrations on sensitive hosts", "Job posting search correlation"],
    recommendation: "Increase DLP monitoring on flagged users, review access permissions, notify HR liaison.",
    confidence: "High",
    affectedAssets: 3,
  },
  {
    id: "ews-003",
    title: "Supply Chain Attack Vector Emerging",
    description: "A key third-party software vendor in your stack has been linked to a new threat campaign. 47% of similar organizations have been targeted in the last 14 days.",
    probability: 61,
    severity: "high",
    eta: "7–14 days",
    category: "Supply Chain",
    signals: ["Vendor software unsigned update pushed", "Threat intel: vendor breach reported", "Anomalous network calls from vendor agent", "CISA advisory correlation"],
    recommendation: "Sandbox vendor software updates, audit vendor access tokens, prepare rollback procedures.",
    confidence: "Medium",
    affectedAssets: 128,
  },
  {
    id: "ews-004",
    title: "DDoS Attack Window Predicted",
    description: "Network traffic pattern analysis and external threat intelligence suggest a targeted DDoS campaign is in the preparation phase targeting your public-facing infrastructure.",
    probability: 54,
    severity: "medium",
    eta: "2–5 days",
    category: "DDoS",
    signals: ["Reconnaissance scans from 14 known botnet IPs", "Traffic volume baseline deviation +45%", "Similar org attacks in same sector this week"],
    recommendation: "Activate DDoS protection scrubbing, coordinate with upstream ISP, verify CDN configuration.",
    confidence: "Medium",
    affectedAssets: 8,
  },
  {
    id: "ews-005",
    title: "Credential Stuffing Campaign Forming",
    description: "Aggregated telemetry shows your auth endpoints are being pre-mapped as part of a large-scale credential stuffing operation targeting financial sector organizations.",
    probability: 42,
    severity: "medium",
    eta: "5–10 days",
    category: "Account Takeover",
    signals: ["Auth endpoint enumeration from 230 IPs", "Compromised credential list matching domain"],
    recommendation: "Enable CAPTCHA on login, enforce MFA for all privileged accounts, pre-block known stuffing IP ranges.",
    confidence: "Medium",
    affectedAssets: 1,
  },
];

const sevColors: Record<string, string> = {
  critical: "text-red-400 border-red-500/40 bg-red-500/10",
  high:     "text-orange-400 border-orange-500/40 bg-orange-500/10",
  medium:   "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
  low:      "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
};

const probColor = (p: number) =>
  p >= 80 ? "text-red-400" : p >= 60 ? "text-orange-400" : p >= 40 ? "text-yellow-400" : "text-emerald-400";

const probBg = (p: number) =>
  p >= 80 ? "bg-red-500" : p >= 60 ? "bg-orange-500" : p >= 40 ? "bg-yellow-500" : "bg-emerald-500";

export default function PredictiveEWS() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<typeof MOCK_SIGNALS[0] | null>(MOCK_SIGNALS[0]);

  const critical = MOCK_SIGNALS.filter(s => s.severity === "critical").length;
  const high = MOCK_SIGNALS.filter(s => s.severity === "high").length;
  const avgProb = Math.round(MOCK_SIGNALS.reduce((a, s) => a + s.probability, 0) / MOCK_SIGNALS.length);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-cyan-400 font-mono">PREDICTIVE EARLY WARNING</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">AI threat forecasting · ML signal correlation · Pre-attack detection</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
          <Activity className="w-3.5 h-3.5" />
          <span>EWS ENGINE ACTIVE</span>
        </div>
      </div>

      {/* Alert banner for critical */}
      {critical > 0 && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 animate-pulse" />
          <div className="text-xs font-mono text-red-300">
            <span className="font-bold">{critical} CRITICAL prediction signal{critical > 1 ? "s" : ""} active</span>
            {" — "} Immediate review and mitigation recommended.
          </div>
          <Button size="sm" onClick={() => toast({ title: "Escalated to CISO", description: `${critical} critical signal${critical > 1 ? "s" : ""} escalated. SOC lead and CISO have been notified via secure channel.` })}
            className="ml-auto bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 font-mono text-xs h-7">
            ESCALATE
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "ACTIVE SIGNALS", value: MOCK_SIGNALS.length, icon: Radar, color: "cyan" },
          { label: "CRITICAL RISK", value: critical, icon: AlertTriangle, color: "red" },
          { label: "HIGH RISK", value: high, icon: TrendingUp, color: "orange" },
          { label: "AVG PROBABILITY", value: `${avgProb}%`, icon: Brain, color: "violet" },
        ].map(s => (
          <div key={s.label} className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-mono tracking-wider">{s.label}</span>
              <s.icon className={cn("w-4 h-4", `text-${s.color}-400`)} />
            </div>
            <div className={cn("text-2xl font-bold font-mono", `text-${s.color}-400`)}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Signal list */}
        <div className="col-span-2 space-y-3">
          {MOCK_SIGNALS.map(sig => (
            <div key={sig.id} onClick={() => setSelected(sig)}
              className={cn("bg-slate-900/60 border rounded-lg p-4 cursor-pointer hover:border-cyan-500/40 transition-all group",
                selected?.id === sig.id ? "border-cyan-500/60 bg-slate-900/80" : "border-slate-700/50"
              )}>
              <div className="flex items-start gap-4">
                {/* Probability ring */}
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-800" />
                    <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4"
                      stroke={sig.probability >= 80 ? "#ef4444" : sig.probability >= 60 ? "#f97316" : sig.probability >= 40 ? "#eab308" : "#10b981"}
                      strokeDasharray={`${(sig.probability / 100) * 113.1} 113.1`} strokeLinecap="round" />
                  </svg>
                  <span className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold font-mono leading-none", probColor(sig.probability))}>
                    {sig.probability}%
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-slate-100 font-mono">{sig.title}</span>
                    <Badge className={cn("text-[10px] font-mono border px-1.5 py-0", sevColors[sig.severity])}>{sig.severity.toUpperCase()}</Badge>
                    <Badge className="text-[10px] font-mono border border-slate-600/50 bg-slate-800/50 text-slate-400 px-1.5 py-0">{sig.category}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 font-mono line-clamp-2">{sig.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ETA: {sig.eta}</span>
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {sig.affectedAssets} assets</span>
                    <span className="text-slate-600">Confidence: {sig.confidence}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors flex-shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-5 sticky top-6">
          {selected ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100 font-mono leading-tight">{selected.title}</h3>
                </div>
                <Badge className={cn("text-[10px] font-mono border px-1.5 py-0 mt-1", sevColors[selected.severity])}>
                  {selected.severity.toUpperCase()}
                </Badge>
              </div>
              {/* Big probability */}
              <div className="text-center py-4 border border-slate-700/50 rounded-lg">
                <div className={cn("text-5xl font-black font-mono", probColor(selected.probability))}>{selected.probability}%</div>
                <div className="text-xs text-slate-500 font-mono mt-1">ATTACK PROBABILITY</div>
                <div className="w-3/4 mx-auto bg-slate-800 rounded-full h-1.5 mt-2">
                  <div className={cn("h-1.5 rounded-full", probBg(selected.probability))} style={{ width: `${selected.probability}%` }} />
                </div>
              </div>
              {/* Meta */}
              <div className="space-y-1.5 text-xs font-mono">
                {[
                  ["ETA", selected.eta],
                  ["Category", selected.category],
                  ["Confidence", selected.confidence],
                  ["Affected Assets", selected.affectedAssets],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between">
                    <span className="text-slate-500">{k}</span>
                    <span className="text-slate-200">{v}</span>
                  </div>
                ))}
              </div>
              {/* Signals */}
              <div>
                <div className="text-xs text-slate-500 font-mono mb-2 tracking-wider">CONTRIBUTING SIGNALS</div>
                <div className="space-y-1.5">
                  {selected.signals.map(s => (
                    <div key={s} className="flex items-start gap-2 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1.5">
                      <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" />{s}
                    </div>
                  ))}
                </div>
              </div>
              {/* Recommendation */}
              <div>
                <div className="text-xs text-slate-500 font-mono mb-2 tracking-wider">AI RECOMMENDATION</div>
                <div className="text-xs font-mono text-slate-300 bg-cyan-500/5 border border-cyan-500/20 rounded p-3 leading-relaxed">
                  {selected.recommendation}
                </div>
              </div>
              <Button className="w-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-mono text-xs gap-2"
                onClick={() => toast({ title: "Playbook triggered", description: `Response playbook for '${selected.title}' initiated.` })}>
                <Zap className="w-3 h-3" /> TRIGGER RESPONSE PLAYBOOK
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
              <Radar className="w-10 h-10 text-slate-700" />
              <p className="text-xs text-slate-600 font-mono">Select a signal to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
