import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClipboardCheck, Shield, AlertTriangle, CheckCircle2, XCircle,
  ChevronRight, RefreshCcw, Download, Loader2, Info, Lock,
  TrendingUp, Filter, Bot, StopCircle, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface FrameworkSummary {
  key: string; name: string; shortName: string;
  score: number; covered: number; partial: number; gap: number; total: number;
}
interface ControlDetail {
  id: string; title: string; description: string; category: string;
  modules: string[]; status: "covered" | "partial" | "gap";
  coveredModules: string[]; missingModules: string[];
}
interface FrameworkDetail {
  framework: { key: string; name: string; shortName: string; version: string; description: string };
  posture: { score: number; covered: number; partial: number; gap: number; total: number; controls: ControlDetail[] };
  activeModules: string[];
}
interface GapRec { module: string; label: string; controlsCovered: number; message: string; }

const FRAMEWORK_COLORS: Record<string, { ring: string; bar: string; badge: string; bg: string }> = {
  nist_csf:     { ring: "stroke-cyan-400",    bar: "bg-cyan-400",    badge: "text-cyan-400 border-cyan-400/40 bg-cyan-400/10",    bg: "border-cyan-400/30" },
  iso_27001:    { ring: "stroke-violet-400",  bar: "bg-violet-400",  badge: "text-violet-400 border-violet-400/40 bg-violet-400/10", bg: "border-violet-400/30" },
  cis_controls: { ring: "stroke-amber-400",   bar: "bg-amber-400",   badge: "text-amber-400 border-amber-400/40 bg-amber-400/10",   bg: "border-amber-400/30" },
  soc2:         { ring: "stroke-emerald-400", bar: "bg-emerald-400", badge: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10", bg: "border-emerald-400/30" },
  hipaa:        { ring: "stroke-rose-400",    bar: "bg-rose-400",    badge: "text-rose-400 border-rose-400/40 bg-rose-400/10",    bg: "border-rose-400/30" },
  cmmc:         { ring: "stroke-orange-400",  bar: "bg-orange-400",  badge: "text-orange-400 border-orange-400/40 bg-orange-400/10", bg: "border-orange-400/30" },
};

const MODULE_LABELS: Record<string, string> = {
  command_center: "Command Center", agent_fleet: "Agent Fleet", sprint_ops: "Sprint Ops",
  missions: "Missions", threat_intel: "Threat Intel", detection_eng: "Detection Eng.",
  incidents: "Incidents", event_log: "Event Log", adversarial_sim: "Adversarial Sim",
  threat_hunting: "Threat Hunting", ai_copilot: "AI Copilot", compliance: "Compliance",
  behavioral_analytics: "Behavioral Analytics", playbooks: "Playbooks",
  executive: "Executive Dashboard", early_warning: "Early Warning",
};

function ScoreRing({ score, color, size = 80 }: { score: number; color: string; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="6"
        className={color} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="butt" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
    </svg>
  );
}

function StatusBadge({ status }: { status: "covered" | "partial" | "gap" }) {
  if (status === "covered") return (
    <span className="flex items-center gap-1 text-emerald-400 text-xs font-mono border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5">
      <CheckCircle2 className="h-3 w-3" />COVERED
    </span>
  );
  if (status === "partial") return (
    <span className="flex items-center gap-1 text-amber-400 text-xs font-mono border border-amber-400/30 bg-amber-400/10 px-2 py-0.5">
      <AlertTriangle className="h-3 w-3" />PARTIAL
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-destructive text-xs font-mono border border-destructive/30 bg-destructive/10 px-2 py-0.5">
      <XCircle className="h-3 w-3" />GAP
    </span>
  );
}

export default function Compliance() {
  const [posture, setPosture] = useState<FrameworkSummary[]>([]);
  const [gaps, setGaps] = useState<GapRec[]>([]);
  const [selected, setSelected] = useState<string>("nist_csf");
  const [detail, setDetail] = useState<FrameworkDetail | null>(null);
  const [loadingPosture, setLoadingPosture] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "covered" | "partial" | "gap">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiStreaming, setAiStreaming] = useState(false);
  const aiAbortRef = useRef(false);

  const fetchPosture = useCallback(async () => {
    try {
      const [postureRes, gapsRes] = await Promise.all([
        fetch(`${BASE}/api/compliance/posture`, { credentials: "include" }),
        fetch(`${BASE}/api/compliance/gaps`, { credentials: "include" }),
      ]);
      if (postureRes.ok) { const d = await postureRes.json(); setPosture(d.frameworks); }
      if (gapsRes.ok) { const d = await gapsRes.json(); setGaps(d.recommendations); }
    } finally { setLoadingPosture(false); setRefreshing(false); }
  }, []);

  const fetchDetail = useCallback(async (key: string) => {
    setLoadingDetail(true);
    setAiAnalysis("");
    try {
      const r = await fetch(`${BASE}/api/compliance/framework/${key}`, { credentials: "include" });
      if (r.ok) setDetail(await r.json());
    } finally { setLoadingDetail(false); }
  }, []);

  useEffect(() => { fetchPosture(); }, [fetchPosture]);
  useEffect(() => { if (selected) fetchDetail(selected); }, [selected, fetchDetail]);

  const selectedPosture = posture.find(f => f.key === selected);
  const colors = FRAMEWORK_COLORS[selected] ?? FRAMEWORK_COLORS["nist_csf"];

  const categories = detail ? ["all", ...Array.from(new Set(detail.posture.controls.map(c => c.category)))] : ["all"];
  const filteredControls = detail?.posture.controls.filter(c => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterCategory !== "all" && c.category !== filterCategory) return false;
    return true;
  }) ?? [];

  const overallScore = posture.length > 0 ? Math.round(posture.reduce((a, f) => a + f.score, 0) / posture.length) : 0;

  const exportReport = () => {
    if (!detail) return;
    const lines = [
      `# Compliance Report — ${detail.framework.name} ${detail.framework.version}`,
      `Generated: ${new Date().toISOString()}`,
      `Score: ${detail.posture.score}%`,
      `Covered: ${detail.posture.covered} | Partial: ${detail.posture.partial} | Gaps: ${detail.posture.gap}`,
      ``,
      `## Controls`,
      ...detail.posture.controls.map(c =>
        `[${c.status.toUpperCase()}] ${c.id} — ${c.title}\n  ${c.description}\n  Modules: ${c.modules.map(m => MODULE_LABELS[m] ?? m).join(", ")}`
      ),
    ];
    if (aiAnalysis) {
      lines.push(``, `## AI Analysis`, aiAnalysis);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `compliance-${selected}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  async function runAiAnalysis() {
    if (!detail || aiStreaming) return;
    aiAbortRef.current = false;
    setAiStreaming(true);
    setAiAnalysis("");

    const fw = detail.framework;
    const postureSummary = detail.posture;
    const gaps = postureSummary.controls.filter(c => c.status === "gap");
    const partials = postureSummary.controls.filter(c => c.status === "partial");
    const missingMods = Array.from(new Set(gaps.flatMap(c => c.missingModules))).slice(0, 8);

    const systemPrompt = `You are a cybersecurity compliance expert and GRC analyst. Analyze this compliance posture and provide a concise, prioritized, actionable assessment. Be specific and technical. Format your response with clear sections using markdown headers (###). Keep the total response under 600 words.`;

    const userPrompt = `Framework: ${fw.name} ${fw.version}
Compliance Score: ${postureSummary.score}%
Controls: ${postureSummary.covered} covered, ${postureSummary.partial} partial, ${postureSummary.gap} gaps (${postureSummary.total} total)

TOP CONTROL GAPS (${Math.min(gaps.length, 6)} of ${gaps.length}):
${gaps.slice(0, 6).map(c => `- ${c.id}: ${c.title} — Missing: ${c.missingModules.map(m => MODULE_LABELS[m] ?? m).join(", ")}`).join("\n")}

PARTIAL COVERAGE (${Math.min(partials.length, 4)} of ${partials.length}):
${partials.slice(0, 4).map(c => `- ${c.id}: ${c.title}`).join("\n")}

MISSING CAPABILITY MODULES: ${missingMods.map(m => MODULE_LABELS[m] ?? m).join(", ")}

Provide: 1) Overall risk assessment, 2) Top 3 priority remediation actions, 3) Quick wins (partial → covered), 4) Regulatory exposure if applicable.`;

    try {
      const resp = await fetch(`${BASE}/api/copilot/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userPrompt },
          ],
        }),
      });

      if (!resp.ok || !resp.body) {
        setAiAnalysis("Failed to connect to AI analysis service. Please try again.");
        setAiStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        if (aiAbortRef.current) break;
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.done) { setAiStreaming(false); return; }
            if (json.error) { setAiAnalysis(prev => prev + `\n\n[Error: ${json.error}]`); break; }
            if (json.content) setAiAnalysis(prev => prev + json.content);
          } catch {}
        }
      }
    } catch {
      setAiAnalysis("Network error. Please check your connection and try again.");
    } finally {
      setAiStreaming(false);
    }
  }

  function stopAiAnalysis() {
    aiAbortRef.current = true;
    setAiStreaming(false);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-primary/70 tracking-widest mb-1">RAPID FORCE // COMPLIANCE & GRC</div>
          <h1 className="text-2xl font-bold tracking-wider">COMPLIANCE POSTURE</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Framework coverage mapped to active platform modules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportReport} disabled={!detail}
            className="flex items-center gap-1.5 text-xs font-mono border border-border text-muted-foreground px-3 py-1.5 hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Download className="h-3 w-3" />EXPORT
          </button>
          <button onClick={() => { setRefreshing(true); fetchPosture(); if (selected) fetchDetail(selected); }} disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-mono border border-border text-muted-foreground px-3 py-1.5 hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50">
            <RefreshCcw className={cn("h-3 w-3", refreshing && "animate-spin")} />REFRESH
          </button>
        </div>
      </div>

      {loadingPosture ? (
        <div className="grid grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-card border border-border animate-pulse" />)}</div>
      ) : (
        <>
          {/* Overall score strip */}
          <div className="bg-card border border-border px-5 py-4 flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <ScoreRing score={overallScore} color="stroke-primary" size={72} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold font-mono text-primary">{overallScore}</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-mono text-muted-foreground tracking-widest">OVERALL COMPLIANCE SCORE</div>
                <div className="text-2xl font-bold font-mono">{overallScore}%</div>
                <div className="text-xs font-mono text-muted-foreground">
                  {overallScore >= 80 ? "Strong posture" : overallScore >= 60 ? "Moderate posture — gaps present" : "Significant gaps — action required"}
                </div>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4 pl-6 border-l border-border">
              {[
                { label: "FRAMEWORKS TRACKED", value: posture.length },
                { label: "CONTROLS COVERED", value: posture.reduce((a, f) => a + f.covered, 0), color: "text-emerald-400" },
                { label: "CONTROL GAPS", value: posture.reduce((a, f) => a + f.gap, 0), color: "text-destructive" },
              ].map(m => (
                <div key={m.label}>
                  <div className="text-xs font-mono text-muted-foreground mb-1">{m.label}</div>
                  <div className={cn("text-xl font-bold font-mono", m.color ?? "")}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Framework score cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {posture.map(f => {
              const c = FRAMEWORK_COLORS[f.key] ?? FRAMEWORK_COLORS["nist_csf"];
              const isActive = f.key === selected;
              return (
                <button key={f.key} onClick={() => { setSelected(f.key); setFilterStatus("all"); setFilterCategory("all"); }}
                  className={cn(
                    "border p-3 text-left transition-all hover:border-border/80",
                    isActive ? `${c.bg} border-opacity-60` : "border-border bg-card/60"
                  )}>
                  <div className="flex items-start justify-between mb-2">
                    <span className={cn("text-xs font-mono border px-1.5 py-0.5", c.badge)}>{f.shortName}</span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="relative">
                      <ScoreRing score={f.score} color={c.ring} size={44} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold font-mono">{f.score}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold font-mono">{f.score}%</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{f.covered}/{f.total}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main content: Framework detail + Gap Analysis */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Controls table (2/3) */}
            <div className="xl:col-span-2 space-y-3">
              {selectedPosture && (
                <div className={cn("bg-card border px-5 py-4", colors.bg)}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-bold tracking-wide">
                        {detail?.framework.name ?? selectedPosture.name}
                        {detail && <span className="text-xs font-mono text-muted-foreground ml-2">v{detail.framework.version}</span>}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground mt-0.5">{detail?.framework.description}</div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 pl-4">
                      <div className="text-right">
                        <div className={cn("text-2xl font-bold font-mono", colors.badge.split(" ")[0])}>{selectedPosture.score}%</div>
                        <div className="text-xs font-mono text-muted-foreground">{selectedPosture.covered} covered</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    {[
                      { label: "COVERED", value: selectedPosture.covered, cls: "text-emerald-400" },
                      { label: "PARTIAL", value: selectedPosture.partial, cls: "text-amber-400" },
                      { label: "GAP",     value: selectedPosture.gap,     cls: "text-destructive" },
                    ].map(s => (
                      <button key={s.label}
                        onClick={() => setFilterStatus(prev => prev === s.label.toLowerCase() as any ? "all" : s.label.toLowerCase() as any)}
                        className={cn(
                          "border px-3 py-2 text-center transition-colors hover:border-border",
                          filterStatus === s.label.toLowerCase() ? "border-border bg-background/50" : "border-border/40 bg-background/20"
                        )}>
                        <div className={cn("text-lg font-bold", s.cls)}>{s.value}</div>
                        <div className="text-muted-foreground">{s.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters */}
              {detail && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground">CATEGORY:</span>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setFilterCategory(cat)}
                      className={cn(
                        "text-xs font-mono border px-2 py-0.5 transition-colors",
                        filterCategory === cat ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-border/80"
                      )}>
                      {cat === "all" ? "ALL" : cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              {/* Controls list */}
              <div className="bg-card border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/20">
                  <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                  <div className="text-xs font-mono text-muted-foreground tracking-widest">
                    CONTROLS {filteredControls.length > 0 && `(${filteredControls.length})`}
                  </div>
                  {filterStatus !== "all" && (
                    <button onClick={() => setFilterStatus("all")}
                      className="ml-auto text-xs font-mono text-muted-foreground hover:text-foreground border border-border px-2 py-0.5">
                      CLEAR FILTER
                    </button>
                  )}
                </div>

                {loadingDetail ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-xs font-mono text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />LOADING CONTROLS...
                  </div>
                ) : filteredControls.length === 0 ? (
                  <div className="py-10 text-center text-xs font-mono text-muted-foreground">No controls match current filters</div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {filteredControls.map(control => (
                      <div key={control.id}
                        className={cn(
                          "px-4 py-3 transition-colors hover:bg-muted/10",
                          control.status === "gap" ? "bg-destructive/3" : control.status === "partial" ? "bg-amber-400/3" : ""
                        )}>
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            {control.status === "covered"
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              : control.status === "partial"
                                ? <AlertTriangle className="h-4 w-4 text-amber-400" />
                                : <XCircle className="h-4 w-4 text-destructive" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="text-xs font-mono text-muted-foreground border border-border px-1.5 py-0.5 shrink-0">{control.id}</span>
                              <span className="text-sm font-medium">{control.title}</span>
                              <span className="text-xs font-mono text-muted-foreground border border-border/50 px-1.5 py-0.5">{control.category}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{control.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {control.modules.map(m => (
                                <span key={m} className={cn(
                                  "text-[10px] font-mono border px-1.5 py-0.5",
                                  control.coveredModules.includes(m)
                                    ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                                    : "text-destructive border-destructive/30 bg-destructive/10"
                                )}>
                                  {control.coveredModules.includes(m) ? "✓" : "✗"} {MODULE_LABELS[m] ?? m}
                                </span>
                              ))}
                            </div>
                          </div>
                          <StatusBadge status={control.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* AI Compliance Analysis */}
              <div className="bg-card border border-border">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <Bot className="h-4 w-4 text-primary" />
                  <div className="text-xs font-mono text-muted-foreground tracking-widest">AI COMPLIANCE ANALYSIS</div>
                </div>
                <div className="p-4 space-y-3">
                  {!aiAnalysis && !aiStreaming && (
                    <p className="text-xs font-mono text-muted-foreground">
                      Generate an AI-powered compliance gap analysis with prioritized remediation recommendations for the selected framework.
                    </p>
                  )}
                  {(aiAnalysis || aiStreaming) && (
                    <div className="text-xs font-mono text-foreground/90 leading-relaxed space-y-1 max-h-80 overflow-y-auto pr-1">
                      {aiAnalysis.split("\n").map((line, i) => (
                        <div key={i} className={cn(
                          line.startsWith("### ") ? "text-primary font-bold mt-3 mb-1 text-[11px] tracking-wider" :
                          line.startsWith("## ")  ? "text-primary font-bold mt-2 mb-1" :
                          line.startsWith("- ") || line.startsWith("* ") ? "pl-2 text-foreground/80" :
                          line.match(/^\d+\./) ? "text-foreground font-medium" :
                          line.trim() === "" ? "h-2" :
                          "text-foreground/80"
                        )}>{line.replace(/^###?\s*/, "")}</div>
                      ))}
                      {aiStreaming && <span className="text-primary animate-pulse">█</span>}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {!aiStreaming ? (
                      <button
                        onClick={runAiAnalysis}
                        disabled={!detail || loadingDetail}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 text-xs font-mono border px-3 py-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                          aiAnalysis
                            ? "border-primary/30 text-primary hover:bg-primary/10"
                            : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                        )}>
                        <Sparkles className="h-3.5 w-3.5" />
                        {aiAnalysis ? "RE-ANALYZE" : "ANALYZE WITH AI"}
                      </button>
                    ) : (
                      <button onClick={stopAiAnalysis}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-mono border border-destructive/30 text-destructive hover:bg-destructive/10 px-3 py-2 transition-all">
                        <StopCircle className="h-3.5 w-3.5" />STOP
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Gap analysis */}
              <div className="bg-card border border-border">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <div className="text-xs font-mono text-muted-foreground tracking-widest">GAP ANALYSIS</div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-mono text-muted-foreground mb-3">
                    Modules that would have the highest compliance impact if enabled:
                  </p>
                  {gaps.length === 0 ? (
                    <div className="text-xs font-mono text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />Full coverage achieved
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {gaps.slice(0, 6).map((rec, i) => (
                        <div key={rec.module} className="flex items-start gap-2.5 p-2.5 border border-border/50 bg-background/30">
                          <div className="flex h-5 w-5 items-center justify-center bg-primary/10 border border-primary/30 text-[10px] font-bold text-primary shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium">{rec.label}</div>
                            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              +{rec.controlsCovered} controls across all frameworks
                            </div>
                          </div>
                          <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0 mt-0.5" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Framework score breakdown */}
              <div className="bg-card border border-border">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <Shield className="h-4 w-4 text-primary" />
                  <div className="text-xs font-mono text-muted-foreground tracking-widest">ALL FRAMEWORKS</div>
                </div>
                <div className="divide-y divide-border/50">
                  {posture.map(f => {
                    const c = FRAMEWORK_COLORS[f.key] ?? FRAMEWORK_COLORS["nist_csf"];
                    return (
                      <button key={f.key} onClick={() => setSelected(f.key)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/10 text-left",
                          selected === f.key ? "bg-muted/20" : ""
                        )}>
                        <span className={cn("text-xs font-mono border px-1.5 py-0.5 w-20 text-center shrink-0", c.badge)}>{f.shortName}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono text-muted-foreground">{f.covered}/{f.total} controls</span>
                            <span className="text-xs font-mono font-bold">{f.score}%</span>
                          </div>
                          <div className="h-1.5 bg-muted/30 w-full overflow-hidden">
                            <div className={cn("h-full transition-all", c.bar)} style={{ width: `${f.score}%` }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* How scores are calculated */}
              <div className="bg-card border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="text-xs font-mono text-muted-foreground tracking-widest">HOW SCORES ARE CALCULATED</div>
                </div>
                <div className="space-y-2 text-xs font-mono text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                    <span><span className="text-emerald-400">Covered</span> — all required modules active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                    <span><span className="text-amber-400">Partial</span> — some modules active (0.5× weight)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-3 w-3 text-destructive shrink-0" />
                    <span><span className="text-destructive">Gap</span> — no required modules active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
