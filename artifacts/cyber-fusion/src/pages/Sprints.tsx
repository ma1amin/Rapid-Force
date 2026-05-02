import { useState } from "react";
import { useListSprints, useCreateSprint, useUpdateSprint, getListSprintsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Zap, PlusCircle, CheckCircle2, Play, Pause, Clock } from "lucide-react";

const REFETCH_MS = 30_000;

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  planning: { label: "PLANNING", color: "text-muted-foreground border-border", icon: <Clock className="h-3 w-3" /> },
  active: { label: "ACTIVE", color: "text-primary border-primary/30 bg-primary/10", icon: <Play className="h-3 w-3" /> },
  paused: { label: "PAUSED", color: "text-accent border-accent/30 bg-accent/10", icon: <Pause className="h-3 w-3" /> },
  complete: { label: "COMPLETE", color: "text-primary/60 border-primary/20 bg-primary/5", icon: <CheckCircle2 className="h-3 w-3" /> },
};

export default function Sprints() {
  const qc = useQueryClient();
  const { data: sprints, isLoading } = useListSprints({ query: { refetchInterval: REFETCH_MS } });
  const createSprint = useCreateSprint({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSprintsQueryKey() });
        setShowForm(false);
        setForm({ name: "", objective: "", startDate: "", endDate: "" });
      },
    },
  });
  const updateSprint = useUpdateSprint({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListSprintsQueryKey() }),
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", objective: "", startDate: "", endDate: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.objective || !form.startDate || !form.endDate) return;
    createSprint.mutate({ data: form });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateSprint.mutate({ id, data: { status: status as any } });
  };

  const handleProgressChange = (id: number, progress: number) => {
    updateSprint.mutate({ id, data: { progress } });
  };

  const sorted = [...(sprints ?? [])].sort((a, b) => b.id - a.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // SPRINT MANAGEMENT</div>
          <h1 className="text-2xl font-bold tracking-wider">SPRINT OPERATIONS</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 border border-primary px-4 py-2 text-sm font-mono text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          NEW SPRINT
        </button>
      </div>

      {/* Status counts */}
      <div className="flex flex-wrap gap-3">
        {["planning", "active", "paused", "complete"].map((s) => {
          const count = sprints?.filter((sp) => sp.status === s).length ?? 0;
          const cfg = statusConfig[s];
          return (
            <div key={s} className="bg-card border border-border p-3 flex-1 min-w-28">
              <div className="text-xs font-mono text-muted-foreground">{cfg.label}</div>
              <div className={`text-2xl font-bold font-mono mt-1 ${cfg.color.split(" ")[0]}`}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-primary p-5 space-y-4">
          <div className="text-xs font-mono text-primary tracking-widest">INITIALIZE NEW SPRINT</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">SPRINT NAME</label>
              <input
                type="text"
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Sprint 3 — ..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">OBJECTIVE</label>
              <input
                type="text"
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
                placeholder="Primary objective..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">START DATE</label>
              <input
                type="date"
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">END DATE</label>
              <input
                type="date"
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createSprint.isPending} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-mono hover:opacity-90 disabled:opacity-50">
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
          {sorted.map((sprint) => {
            const cfg = statusConfig[sprint.status];
            return (
              <div key={sprint.id} className="bg-card border border-border p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`flex items-center gap-1 text-xs font-mono border px-2 py-0.5 ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-lg font-bold tracking-wide truncate">{sprint.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">{sprint.objective}</div>
                  </div>
                  <select
                    className="shrink-0 bg-background border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                    value={sprint.status}
                    onChange={(e) => handleStatusChange(sprint.id, e.target.value)}
                  >
                    <option value="planning">PLANNING</option>
                    <option value="active">ACTIVE</option>
                    <option value="paused">PAUSED</option>
                    <option value="complete">COMPLETE</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">PROGRESS</span>
                    <span className="text-primary">{sprint.progress}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Number(sprint.progress)}
                    onChange={(e) => handleProgressChange(sprint.id, Number(e.target.value))}
                    className="w-full accent-primary h-1"
                  />
                </div>

                <div className="flex gap-6 text-xs font-mono text-muted-foreground border-t border-border pt-3">
                  <span>START: <span className="text-foreground">{sprint.startDate}</span></span>
                  <span>END: <span className="text-foreground">{sprint.endDate}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
