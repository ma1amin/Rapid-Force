import { useState } from "react";
import { useListMissions, useCreateMission, useUpdateMission, useListAgents, useListSprints, getListMissionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Target, PlusCircle, Activity, Clock, CheckCircle2, XCircle, Filter } from "lucide-react";

const REFETCH_MS = 30_000;

const statusIcon: Record<string, React.ReactNode> = {
  active: <Activity className="h-3 w-3 text-primary" />,
  pending: <Clock className="h-3 w-3 text-muted-foreground" />,
  complete: <CheckCircle2 className="h-3 w-3 text-primary" />,
  failed: <XCircle className="h-3 w-3 text-destructive" />,
};

const priorityColor: Record<string, string> = {
  critical: "text-destructive border-destructive/30 bg-destructive/10",
  high: "text-accent border-accent/30 bg-accent/10",
  medium: "text-primary border-primary/30 bg-primary/10",
  low: "text-muted-foreground border-border",
};

const statusColor: Record<string, string> = {
  active: "text-primary",
  pending: "text-muted-foreground",
  complete: "text-primary/60",
  failed: "text-destructive",
};

export default function Missions() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: missions, isLoading } = useListMissions(
    statusFilter ? { status: statusFilter as any } : {},
    { query: { queryKey: getListMissionsQueryKey(statusFilter ? { status: statusFilter as any } : {}), refetchInterval: REFETCH_MS } }
  );
  const { data: agents } = useListAgents({ query: { refetchInterval: REFETCH_MS } });
  const { data: sprints } = useListSprints({ query: { refetchInterval: REFETCH_MS } });

  const createMission = useCreateMission({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMissionsQueryKey() });
        setShowForm(false);
        setForm({ title: "", description: "", priority: "medium", category: "", assignedAgentId: "", sprintId: "" });
      },
    },
  });
  const updateMission = useUpdateMission({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListMissionsQueryKey() }),
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", category: "", assignedAgentId: "", sprintId: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category) return;
    createMission.mutate({
      data: {
        title: form.title,
        description: form.description,
        priority: form.priority as any,
        category: form.category,
        ...(form.assignedAgentId ? { assignedAgentId: Number(form.assignedAgentId) } : {}),
        ...(form.sprintId ? { sprintId: Number(form.sprintId) } : {}),
      },
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateMission.mutate({ id, data: { status: status as any } });
  };

  const agentName = (id: number | null | undefined) =>
    id ? agents?.find((a) => a.id === id)?.name ?? `AGT-${id}` : "UNASSIGNED";

  const allMissions = useListMissions({}, { query: { queryKey: getListMissionsQueryKey({}) } });
  const counts = {
    active: allMissions.data?.filter((m) => m.status === "active").length ?? 0,
    pending: allMissions.data?.filter((m) => m.status === "pending").length ?? 0,
    complete: allMissions.data?.filter((m) => m.status === "complete").length ?? 0,
    failed: allMissions.data?.filter((m) => m.status === "failed").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // MISSION CONTROL</div>
          <h1 className="text-2xl font-bold tracking-wider">MISSION BOARD</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 border border-primary px-4 py-2 text-sm font-mono text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          NEW MISSION
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(counts).map(([status, count]) => (
          <div
            key={status}
            className={`bg-card border p-3 flex-1 min-w-28 cursor-pointer transition-colors ${statusFilter === status ? "border-primary" : "border-border hover:border-muted-foreground"}`}
            onClick={() => setStatusFilter(statusFilter === status ? "" : status)}
          >
            <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
              {statusIcon[status]} {status.toUpperCase()}
            </div>
            <div className={`text-2xl font-bold font-mono mt-1 ${statusColor[status]}`}>{count}</div>
          </div>
        ))}
      </div>

      {statusFilter && (
        <div className="flex items-center gap-2 text-xs font-mono text-primary">
          <Filter className="h-3 w-3" />
          FILTERING BY: {statusFilter.toUpperCase()}
          <button onClick={() => setStatusFilter("")} className="text-muted-foreground hover:text-foreground ml-2">[CLEAR]</button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-primary p-5 space-y-4">
          <div className="text-xs font-mono text-primary tracking-widest">CREATE NEW MISSION</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">TITLE</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Mission title" required />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">CATEGORY</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Security / Infrastructure / ..." required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-muted-foreground mb-1">DESCRIPTION</label>
              <textarea className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary resize-none"
                rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mission briefing..." required />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">PRIORITY</label>
              <select className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="critical">CRITICAL</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">ASSIGN AGENT</label>
              <select className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.assignedAgentId} onChange={(e) => setForm({ ...form, assignedAgentId: e.target.value })}>
                <option value="">UNASSIGNED</option>
                {agents?.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.role.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">SPRINT</label>
              <select className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.sprintId} onChange={(e) => setForm({ ...form, sprintId: e.target.value })}>
                <option value="">NO SPRINT</option>
                {sprints?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createMission.isPending} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-mono hover:opacity-90 disabled:opacity-50">
              {createMission.isPending ? "DEPLOYING..." : "DEPLOY MISSION"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border text-sm font-mono text-muted-foreground hover:text-foreground">
              CANCEL
            </button>
          </div>
        </form>
      )}

      {/* Mission list */}
      {isLoading ? (
        <div className="text-sm font-mono text-muted-foreground">LOADING MISSIONS...</div>
      ) : (
        <div className="space-y-2">
          {missions?.map((mission) => (
            <div key={mission.id} className="bg-card border border-border p-4 flex items-start gap-4 hover:border-primary/30 transition-colors">
              <div className="mt-0.5 shrink-0">{statusIcon[mission.status]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-sm">{mission.title}</span>
                  <span className={`text-xs font-mono border px-1.5 py-0.5 ${priorityColor[mission.priority]}`}>
                    {mission.priority.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground border border-border px-1.5 py-0.5">{mission.category}</span>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">{mission.description}</div>
                <div className="text-xs font-mono text-muted-foreground mt-1">
                  AGENT: <span className="text-foreground">{agentName(mission.assignedAgentId)}</span>
                </div>
              </div>
              <div className="shrink-0">
                <select
                  className="bg-background border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                  value={mission.status}
                  onChange={(e) => handleStatusChange(mission.id, e.target.value)}
                >
                  <option value="pending">PENDING</option>
                  <option value="active">ACTIVE</option>
                  <option value="complete">COMPLETE</option>
                  <option value="failed">FAILED</option>
                </select>
              </div>
            </div>
          ))}
          {missions?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground font-mono text-sm">
              <Target className="h-8 w-8 mx-auto mb-3 opacity-30" />
              NO MISSIONS FOUND
            </div>
          )}
        </div>
      )}
    </div>
  );
}
