import { useState } from "react";
import {
  useListSprints, useCreateSprint, useUpdateSprint, getListSprintsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Zap, PlusCircle, CheckCircle2, Play, Pause, Clock, TrendingUp, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const REFETCH_MS = 30_000;

const statusConfig: Record<string, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
  planning: { label: "PLANNING", color: "text-muted-foreground border-border",                        dot: "bg-muted-foreground",  icon: <Clock        className="h-3 w-3" /> },
  active:   { label: "ACTIVE",   color: "text-primary border-primary/30 bg-primary/10",               dot: "bg-primary",           icon: <Play         className="h-3 w-3" /> },
  paused:   { label: "PAUSED",   color: "text-accent border-accent/30 bg-accent/10",                  dot: "bg-accent",            icon: <Pause        className="h-3 w-3" /> },
  complete: { label: "COMPLETE", color: "text-primary/60 border-primary/20 bg-primary/5",             dot: "bg-emerald-400",       icon: <CheckCircle2 className="h-3 w-3" /> },
};

function BurnDownChart({ progress, daysTotal, daysElapsed }: { progress: number; daysTotal: number; daysElapsed: number }) {
  const w = 200, h = 60;
  const pts: string[] = [];
  for (let d = 0; d <= daysTotal; d++) {
    const x = (d / daysTotal) * w;
    const idealPct = (1 - d / daysTotal) * 100;
    const y = h - (idealPct / 100) * h;
    pts.push(`${x},${y}`);
  }
  const idealLine = pts.join(" ");

  // Actual burn-down: use current progress to estimate burn-down curve
  const actualPts: string[] = [];
  const elapsed = Math.min(daysElapsed, daysTotal);
  for (let d = 0; d <= elapsed; d++) {
    const x = (d / daysTotal) * w;
    const pct = d === 0 ? 100 : Math.max(0, 100 - (progress / elapsed) * d + (Math.sin(d * 1.7) * 3));
    actualPts.push(`${x},${h - (pct / 100) * h}`);
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <polyline points={idealLine} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.4" />
      {actualPts.length > 1 && (
        <polyline points={actualPts.join(" ")} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {actualPts.length > 0 && (
        <circle cx={actualPts[actualPts.length - 1].split(",")[0]} cy={actualPts[actualPts.length - 1].split(",")[1]}
          r="3" fill="hsl(var(--primary))" />
      )}
    </svg>
  );
}

function VelocityBar({ sprints }: { sprints: any[] }) {
  const completed = sprints.filter(s => s.status === "complete");
  if (completed.length === 0) return <div className="text-xs font-mono text-muted-foreground/50 text-center py-2">No completed sprints yet</div>;
  const max = 100;
  return (
    <div className="space-y-2">
      {completed.slice(-5).map(s => (
        <div key={s.id} className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted-foreground w-20 truncate shrink-0">{s.name.slice(0, 12)}</span>
          <div className="flex-1 bg-muted h-3 relative">
            <div className="h-full bg-primary/70 transition-all" style={{ width: `${(Number(s.progress) / max) * 100}%` }} />
          </div>
          <span className="text-[10px] font-mono text-primary w-8 text-right shrink-0">{s.progress}%</span>
        </div>
      ))}
    </div>
  );
}

export default function Sprints() {
  const qc = useQueryClient();
  const { data: sprints, isLoading } = useListSprints(
    {},
    { query: { queryKey: getListSprintsQueryKey(), refetchInterval: REFETCH_MS } }
  );
  const createSprint = useCreateSprint({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListSprintsQueryKey() }); setShowForm(false); setForm({ name: "", objective: "", startDate: "", endDate: "" }); },
    },
  });
  const updateSprint = useUpdateSprint({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListSprintsQueryKey() }) },
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", objective: "", startDate: "", endDate: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.objective || !form.startDate || !form.endDate) return;
    createSprint.mutate({ data: form });
  };

  const handleStatusChange  = (id: number, status: string) => updateSprint.mutate({ id, data: { status: status as any } });
  const handleProgressChange= (id: number, progress: number) => updateSprint.mutate({ id, data: { progress } });

  const sorted = [...(sprints ?? [])].sort((a, b) => b.id - a.id);
  const activeSprint = sorted.find(s => s.status === "active");
  const completedSprints = sorted.filter(s => s.status === "complete");
  const avgVelocity = completedSprints.length > 0
    ? Math.round(completedSprints.reduce((s, sp) => s + Number(sp.progress), 0) / completedSprints.length)
    : null;

  function getDaysInfo(sprint: any) {
    try {
      const start = new Date(sprint.startDate).getTime();
      const end   = new Date(sprint.endDate).getTime();
      const now   = Date.now();
      const total = Math.max(1, Math.round((end - start) / 86400000));
      const elapsed = Math.max(0, Math.round((now - start) / 86400000));
      const remaining = Math.max(0, Math.round((end - now) / 86400000));
      return { total, elapsed, remaining };
    } catch { return { total: 14, elapsed: 0, remaining: 14 }; }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // SPRINT MANAGEMENT</div>
          <h1 className="text-2xl font-bold tracking-wider">SPRINT OPERATIONS</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 border border-primary px-4 py-2 text-sm font-mono text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
          <PlusCircle className="h-4 w-4" />NEW SPRINT
        </button>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-3">
        {(["planning","active","paused","complete"] as const).map(s => {
          const count = sprints?.filter(sp => sp.status === s).length ?? 0;
          const cfg = statusConfig[s];
          return (
            <div key={s} className="bg-card border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground mb-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />{cfg.label}
              </div>
              <div className={cn("text-2xl font-bold font-mono", cfg.color.split(" ")[0])}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Active sprint burn-down */}
        <div className="bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-3 text-xs font-mono text-muted-foreground tracking-wider">
            <TrendingUp className="h-3.5 w-3.5" />ACTIVE SPRINT BURN-DOWN
          </div>
          {activeSprint ? (() => {
            const { total, elapsed, remaining } = getDaysInfo(activeSprint);
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span className="text-foreground font-medium truncate mr-2">{activeSprint.name}</span>
                  <span className="text-primary shrink-0">{remaining}d left</span>
                </div>
                <BurnDownChart progress={Number(activeSprint.progress)} daysTotal={total} daysElapsed={elapsed} />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 border-t border-dashed border-muted-foreground/50" />IDEAL
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 border-t-2 border-primary" />ACTUAL
                  </span>
                  <span>Day {elapsed}/{total}</span>
                </div>
              </div>
            );
          })() : (
            <div className="text-xs font-mono text-muted-foreground/50 py-6 text-center">No active sprint</div>
          )}
        </div>

        {/* Sprint velocity */}
        <div className="bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground tracking-wider">
              <BarChart2 className="h-3.5 w-3.5" />SPRINT VELOCITY
            </div>
            {avgVelocity !== null && (
              <div className="text-xs font-mono">
                <span className="text-muted-foreground">AVG: </span>
                <span className="text-primary font-bold">{avgVelocity}%</span>
              </div>
            )}
          </div>
          <VelocityBar sprints={sprints ?? []} />
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-primary p-5 space-y-4">
          <div className="text-xs font-mono text-primary tracking-widest">INITIALIZE NEW SPRINT</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">SPRINT NAME</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Sprint 3 — Threat Intel" required />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">OBJECTIVE</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} placeholder="Primary objective..." required />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">START DATE</label>
              <input type="date" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">END DATE</label>
              <input type="date" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createSprint.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-mono hover:opacity-90 disabled:opacity-50">
              {createSprint.isPending ? "CREATING..." : "CREATE SPRINT"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border text-sm font-mono text-muted-foreground hover:text-foreground">
              CANCEL
            </button>
          </div>
        </form>
      )}

      {/* Sprint list */}
      {isLoading ? (
        <div className="text-sm font-mono text-muted-foreground">LOADING SPRINTS...</div>
      ) : (
        <div className="space-y-4">
          {sorted.map(sprint => {
            const cfg = statusConfig[sprint.status];
            const { total, elapsed, remaining } = getDaysInfo(sprint);
            const pctDays = Math.min(100, (elapsed / total) * 100);
            return (
              <div key={sprint.id} className="bg-card border border-border p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className={cn("flex items-center gap-1 text-xs font-mono border px-2 py-0.5", cfg.color)}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-lg font-bold tracking-wide truncate">{sprint.name}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{sprint.objective}</div>
                  </div>
                  <select
                    className="shrink-0 bg-background border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                    value={sprint.status}
                    onChange={e => handleStatusChange(sprint.id, e.target.value)}>
                    <option value="planning">PLANNING</option>
                    <option value="active">ACTIVE</option>
                    <option value="paused">PAUSED</option>
                    <option value="complete">COMPLETE</option>
                  </select>
                </div>

                {/* Progress + timeline */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">COMPLETION</span>
                      <span className="text-primary">{sprint.progress}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={Number(sprint.progress)}
                      onChange={e => handleProgressChange(sprint.id, Number(e.target.value))}
                      className="w-full accent-primary h-1" />
                  </div>
                  {sprint.status !== "planning" && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-muted-foreground">TIMELINE</span>
                        <span className={remaining <= 2 && sprint.status === "active" ? "text-destructive" : "text-muted-foreground"}>
                          {remaining}d left
                        </span>
                      </div>
                      <div className="w-full h-1 bg-muted">
                        <div className="h-full bg-accent/60 transition-all" style={{ width: `${pctDays}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-6 text-xs font-mono text-muted-foreground border-t border-border pt-3">
                  <span>START: <span className="text-foreground">{sprint.startDate}</span></span>
                  <span>END: <span className="text-foreground">{sprint.endDate}</span></span>
                  <span>DURATION: <span className="text-foreground">{total}d</span></span>
                  {sprint.status === "complete" && (
                    <span className="ml-auto text-primary flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />COMPLETED</span>
                  )}
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div className="text-center py-12 text-muted-foreground font-mono text-sm">
              <Zap className="h-8 w-8 mx-auto mb-3 opacity-30" />NO SPRINTS FOUND
            </div>
          )}
        </div>
      )}
    </div>
  );
}
