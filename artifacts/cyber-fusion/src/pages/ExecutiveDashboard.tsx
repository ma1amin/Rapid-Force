import { useState } from "react";
import { LayoutDashboard, Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Download, Calendar, BarChart3, Activity, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PERIODS = ["Last 7 Days", "Last 30 Days", "Last Quarter", "YTD"];

const KPI_DATA = {
  "Last 7 Days": {
    secScore: 78, scoreChange: +3,
    mttr: "4h 12m", mttrChange: -18,
    incidents: 14, incidentsChange: +2,
    threats: 847, threatsChange: -12,
    criticalOpen: 2,
    slaBreaches: 1,
    patchCompliance: 91,
    mfa: 88,
  },
  "Last 30 Days": {
    secScore: 75, scoreChange: +6,
    mttr: "5h 44m", mttrChange: -31,
    incidents: 58, incidentsChange: -7,
    threats: 3241, threatsChange: +4,
    criticalOpen: 3,
    slaBreaches: 4,
    patchCompliance: 89,
    mfa: 86,
  },
  "Last Quarter": {
    secScore: 71, scoreChange: +9,
    mttr: "6h 30m", mttrChange: -44,
    incidents: 173, incidentsChange: -21,
    threats: 9874, threatsChange: +18,
    criticalOpen: 5,
    slaBreaches: 9,
    patchCompliance: 84,
    mfa: 82,
  },
  "YTD": {
    secScore: 68, scoreChange: +12,
    mttr: "7h 55m", mttrChange: -52,
    incidents: 341, incidentsChange: -34,
    threats: 19203, threatsChange: +23,
    criticalOpen: 5,
    slaBreaches: 17,
    patchCompliance: 81,
    mfa: 79,
  },
};

const INCIDENT_TREND = [3, 5, 2, 4, 1, 6, 3, 2, 4, 3, 5, 2, 4, 2];
const THREAT_TREND   = [120, 145, 98, 210, 175, 134, 189, 156, 201, 178, 143, 167, 123, 145];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100, h = 30;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GaugeRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 40, cx = 50, cy = 50;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />
        <text x="50" y="54" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold" fontFamily="monospace">{value}</text>
      </svg>
      <span className="text-[10px] text-slate-500 font-mono text-center">{label}</span>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [period, setPeriod] = useState<keyof typeof KPI_DATA>("Last 30 Days");
  const kpi = KPI_DATA[period];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-cyan-400 font-mono">EXECUTIVE DASHBOARD</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">Security posture summary · Board-ready metrics · Risk KPIs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-900/60 border border-slate-700/50 rounded-lg p-1">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p as keyof typeof KPI_DATA)}
                className={cn("px-3 py-1 rounded text-xs font-mono transition-all",
                  period === p ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-slate-200"
                )}>{p}</button>
            ))}
          </div>
          <Button className="bg-slate-800 border border-slate-700/50 text-slate-300 hover:bg-slate-700 font-mono text-xs gap-2 h-8">
            <Download className="w-3.5 h-3.5" /> EXPORT PDF
          </Button>
        </div>
      </div>

      {/* Security score banner */}
      <div className="bg-gradient-to-r from-cyan-900/20 to-slate-900/60 border border-cyan-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-cyan-400/70 font-mono tracking-widest mb-1">OVERALL SECURITY POSTURE SCORE</div>
            <div className="flex items-end gap-3">
              <span className="text-6xl font-black font-mono text-cyan-400">{kpi.secScore}</span>
              <span className="text-xl font-mono text-slate-500 mb-2">/100</span>
              <div className={cn("flex items-center gap-1 mb-3 text-sm font-mono font-bold",
                kpi.scoreChange > 0 ? "text-emerald-400" : "text-red-400")}>
                {kpi.scoreChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {kpi.scoreChange > 0 ? "+" : ""}{kpi.scoreChange} pts
              </div>
            </div>
            <div className="w-64 bg-slate-800 rounded-full h-2 mt-2">
              <div className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-2 rounded-full transition-all"
                style={{ width: `${kpi.secScore}%` }} />
            </div>
          </div>
          <div className="flex gap-6">
            <GaugeRing value={kpi.patchCompliance} label="PATCH COMPLIANCE" color="#06b6d4" />
            <GaugeRing value={kpi.mfa} label="MFA COVERAGE" color="#a78bfa" />
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "MEAN TIME TO RESPOND",
            value: kpi.mttr,
            change: kpi.mttrChange,
            unit: "% vs prior",
            good: "down",
            icon: Clock,
            color: "amber",
          },
          {
            label: "SECURITY INCIDENTS",
            value: kpi.incidents,
            change: kpi.incidentsChange,
            unit: "% vs prior",
            good: "down",
            icon: AlertTriangle,
            color: "red",
          },
          {
            label: "THREATS BLOCKED",
            value: kpi.threats.toLocaleString(),
            change: kpi.threatsChange,
            unit: "% vs prior",
            good: "up",
            icon: Shield,
            color: "cyan",
          },
          {
            label: "SLA BREACHES",
            value: kpi.slaBreaches,
            change: 0,
            unit: "this period",
            good: "zero",
            icon: Target,
            color: kpi.slaBreaches === 0 ? "emerald" : kpi.slaBreaches <= 3 ? "yellow" : "red",
          },
        ].map(stat => {
          const isGood = stat.good === "up" ? stat.change > 0 : stat.good === "down" ? stat.change < 0 : stat.change === 0;
          const changeColor = stat.change === 0 ? "text-slate-400" : isGood ? "text-emerald-400" : "text-red-400";
          return (
            <div key={stat.label} className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 font-mono tracking-wider leading-tight">{stat.label}</span>
                <stat.icon className={cn("w-4 h-4 flex-shrink-0", `text-${stat.color}-400`)} />
              </div>
              <div className={cn("text-2xl font-bold font-mono", `text-${stat.color}-400`)}>{stat.value}</div>
              {stat.change !== 0 ? (
                <div className={cn("text-xs font-mono mt-1", changeColor)}>
                  {stat.change > 0 ? "+" : ""}{stat.change}% {stat.unit}
                </div>
              ) : (
                <div className="text-xs font-mono mt-1 text-slate-500">{stat.unit}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Trend charts row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 font-mono tracking-wider">INCIDENT VOLUME TREND</span>
            <Activity className="w-4 h-4 text-red-400" />
          </div>
          <Sparkline data={INCIDENT_TREND} color="#f87171" />
          <div className="flex justify-between text-[10px] font-mono text-slate-600 mt-1">
            <span>14 days ago</span><span>Today</span>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 font-mono tracking-wider">THREATS BLOCKED / DAY</span>
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <Sparkline data={THREAT_TREND} color="#22d3ee" />
          <div className="flex justify-between text-[10px] font-mono text-slate-600 mt-1">
            <span>14 days ago</span><span>Today</span>
          </div>
        </div>
      </div>

      {/* Incident severity breakdown + compliance */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-slate-900/60 border border-slate-700/50 rounded-lg p-4">
          <div className="text-xs text-slate-500 font-mono tracking-wider mb-4">INCIDENT SEVERITY BREAKDOWN</div>
          <div className="space-y-3">
            {[
              { label: "Critical", count: kpi.criticalOpen, pct: 14, color: "bg-red-500", text: "text-red-400" },
              { label: "High",     count: 8,               pct: 30, color: "bg-orange-500", text: "text-orange-400" },
              { label: "Medium",   count: 17,              pct: 40, color: "bg-yellow-500", text: "text-yellow-400" },
              { label: "Low",      count: 21,              pct: 16, color: "bg-emerald-500", text: "text-emerald-400" },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className={cn("text-xs font-mono w-16 flex-shrink-0", row.text)}>{row.label}</span>
                <div className="flex-1 bg-slate-800 rounded-full h-2">
                  <div className={cn("h-2 rounded-full", row.color)} style={{ width: `${row.pct}%` }} />
                </div>
                <span className="text-xs font-mono text-slate-400 w-6 text-right">{row.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4">
          <div className="text-xs text-slate-500 font-mono tracking-wider mb-4">COMPLIANCE STATUS</div>
          <div className="space-y-2.5">
            {[
              { label: "NIST CSF",   score: 82, color: "bg-cyan-500" },
              { label: "ISO 27001",  score: 76, color: "bg-violet-500" },
              { label: "SOC 2",      score: 91, color: "bg-emerald-500" },
              { label: "HIPAA",      score: 68, color: "bg-amber-500" },
              { label: "CIS v8",     score: 79, color: "bg-blue-500" },
            ].map(f => (
              <div key={f.label}>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">{f.label}</span>
                  <span className="text-slate-300">{f.score}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div className={cn("h-1.5 rounded-full", f.color)} style={{ width: `${f.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical open items */}
      {kpi.criticalOpen > 0 && (
        <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-mono text-red-400 tracking-wider">{kpi.criticalOpen} CRITICAL OPEN ITEMS REQUIRE EXECUTIVE ATTENTION</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: "Active Ransomware Campaign", since: "2h ago", owner: "SOC Team" },
              { title: "Unpatched CVE-2024-4577 on 12 hosts", since: "5d ago", owner: "IT Ops" },
            ].slice(0, kpi.criticalOpen).map(item => (
              <div key={item.title} className="bg-red-900/20 border border-red-500/20 rounded p-3">
                <div className="text-xs font-mono text-red-300 font-semibold">{item.title}</div>
                <div className="flex gap-4 mt-1 text-[10px] font-mono text-red-500">
                  <span>Open {item.since}</span><span>Owner: {item.owner}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
