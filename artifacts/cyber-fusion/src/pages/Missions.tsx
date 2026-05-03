import { useState } from "react";
import {
  useListMissions, useCreateMission, useUpdateMission,
  useListAgents, useListSprints, getListMissionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Target, PlusCircle, Activity, Clock, CheckCircle2, XCircle,
  Filter, LayoutList, LayoutDashboard, GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

const REFETCH_MS = 30_000;

const priorityColor: Record<string, string> = {
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  high:     "text-accent border-accent/40 bg-accent/10",
  medium:   "text-primary border-primary/40 bg-primary/10",
  low:      "text-muted-foreground border-border",
};
const statusIcon: Record<string, React.ReactNode> = {
  active:   <Activity   className="h-3 w-3 text-primary"         />,
  pending:  <Clock      className="h-3 w-3 text-muted-foreground"/>,
  complete: <CheckCircle2 className="h-3 w-3 text-primary"       />,
  failed:   <XCircle    className="h-3 w-3 text-destructive"     />,
};
const statusColor: Record<string, string> = {
  active:   "text-primary",
  pending:  "text-muted-foreground",
  complete: "text-primary/60",
  failed:   "text-destructive",
};

const COLUMNS = [
  { status: "pending",  label: "PENDING",  dot: "bg-amber-400",   ring: "border-amber-500/20  bg-amber-500/5",  head: "text-amber-400"   },
  { status: "active",   label: "ACTIVE",   dot: "bg-primary",     ring: "border-primary/20    bg-primary/5",    head: "text-primary"     },
  { status: "complete", label: "COMPLETE", dot: "bg-emerald-400", ring: "border-emerald-500/20 bg-emerald-500/5",head: "text-emerald-400" },
  { status: "failed",   label: "FAILED",   dot: "bg-destructive", ring: "border-destructive/20 bg-destructive/5",head: "text-destructive" },
] as const;

type MissionStatus = "pending" | "active" | "complete" | "failed";

export default function Missions() {
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "board">("board");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", category: "", assignedAgentId: "", sprintId: "" });
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const allMissions = useListMissions(
    {},
    { query: { queryKey: getListMissionsQueryKey({}), refetchInterval: REFETCH_MS } }
  );
  const filteredMissions = useListMissions(
    statusFilter ? { status: statusFilter as MissionStatus } : {},
    { query: { queryKey: getListMissionsQueryKey(statusFilter ? { status: statusFilter as MissionStatus } : {}), refetchInterval: REFETCH_MS } }
  );

  const { data: agents } = useListAgents({}, { query: { queryKey: ["agents"], refetchInterval: REFETCH_MS } });
  const { data: sprints } = useListSprints({}, { query: { queryKey: ["sprints"], refetchInterval: REFETCH_MS } });

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
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListMissionsQueryKey() }) },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category) return;
    createMission.mutate({
      data: {
        title: form.title, description: form.description,
        priority: form.priority as any, category: form.category,
        ...(form.assignedAgentId ? { assignedAgentId: Number(form.assignedAgentId) } : {}),
        ...(form.sprintId ? { sprintId: Number(form.sprintId) } : {}),
      },
    });
  };

  const handleStatusChange = (id: number, status: string) =>
    updateMission.mutate({ id, data: { status: status as any } });

  const agentName = (id: number | null | undefined) =>
    id ? (agents?.find(a => a.id === id)?.name ?? `AGT-${id}`) : null;

  const sprintName = (id: number | null | undefined) =>
    id ? (sprints?.find(s => s.id === id)?.name ?? null) : null;

  const counts = {
    active:   allMissions.data?.filter(m => m.status === "active").length   ?? 0,
    pending:  allMissions.data?.filter(m => m.status === "pending").length  ?? 0,
    complete: allMissions.data?.filter(m => m.status === "complete").length ?? 0,
    failed:   allMissions.data?.filter(m => m.status === "failed").length   ?? 0,
  };

  const boardMissions = allMissions.data ?? [];

  // Drag and drop handlers
  const onDragStart = (e: React.DragEvent, id: number) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragEnd = () => { setDraggingId(null); setDragOverCol(null); };
  const onDragOver = (e: React.DragEvent, status: string) => { e.preventDefault(); setDragOverCol(status); };
  const onDragLeave = () => setDragOverCol(null);
  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggingId !== null) {
      const current = boardMissions.find(m => m.id === draggingId);
      if (current && current.status !== status) handleStatusChange(draggingId, status);
    }
    setDraggingId(null);
    setDragOverCol(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // MISSION CONTROL</div>
          <h1 className="text-2xl font-bold tracking-wider">MISSION BOARD</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-border overflow-hidden">
            <button onClick={() => setView("board")}
              className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-mono transition-colors",
                view === "board" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
              <LayoutDashboard className="h-3.5 w-3.5" />BOARD
            </button>
            <button onClick={() => setView("list")}
              className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-l border-border transition-colors",
                view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
              <LayoutList className="h-3.5 w-3.5" />LIST
            </button>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 border border-primary px-4 py-2 text-sm font-mono text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
            <PlusCircle className="h-4 w-4" />NEW MISSION
          </button>
        </div>
      </div>

      {/* Status counters */}
      <div className="flex flex-wrap gap-3">
        {COLUMNS.map(col => (
          <div key={col.status}
            className={cn("bg-card border p-3 flex-1 min-w-28 cursor-pointer transition-colors",
              view === "list" && statusFilter === col.status ? "border-primary" : "border-border hover:border-muted-foreground")}
            onClick={() => view === "list" && setStatusFilter(statusFilter === col.status ? "" : col.status)}>
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground mb-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", col.dot)} />
              {col.label}
            </div>
            <div className={cn("text-2xl font-bold font-mono", col.head)}>
              {counts[col.status as MissionStatus]}
            </div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-primary p-5 space-y-4">
          <div className="text-xs font-mono text-primary tracking-widest">CREATE NEW MISSION</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">TITLE</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Mission title" required />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">CATEGORY</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Security / Detection / ..." required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-muted-foreground mb-1">DESCRIPTION</label>
              <textarea className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary resize-none"
                rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mission briefing..." required />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">PRIORITY</label>
              <select className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="critical">CRITICAL</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">ASSIGN AGENT</label>
              <select className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.assignedAgentId} onChange={e => setForm({ ...form, assignedAgentId: e.target.value })}>
                <option value="">UNASSIGNED</option>
                {agents?.map(a => <option key={a.id} value={a.id}>{a.name} — {a.role.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">SPRINT</label>
              <select className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.sprintId} onChange={e => setForm({ ...form, sprintId: e.target.value })}>
                <option value="">NO SPRINT</option>
                {sprints?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createMission.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-mono hover:opacity-90 disabled:opacity-50">
              {createMission.isPending ? "DEPLOYING..." : "DEPLOY MISSION"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-border text-sm font-mono text-muted-foreground hover:text-foreground">
              CANCEL
            </button>
          </div>
        </form>
      )}

      {/* Board view */}
      {view === "board" && (
        <div className="grid grid-cols-4 gap-4 min-h-[500px]">
          {COLUMNS.map(col => {
            const colMissions = boardMissions.filter(m => m.status === col.status);
            const isOver = dragOverCol === col.status;
            return (
              <div key={col.status}
                className={cn("flex flex-col border rounded-none transition-all", col.ring,
                  isOver ? "border-primary/60 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)]" : "")}
                onDragOver={e => onDragOver(e, col.status)}
                onDragLeave={onDragLeave}
                onDrop={e => onDrop(e, col.status)}>
                {/* Column header */}
                <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                    <span className={cn("text-xs font-mono font-bold tracking-wider", col.head)}>{col.label}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5">{colMissions.length}</span>
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {colMissions.map(mission => {
                    const isDragging = draggingId === mission.id;
                    const agent = agentName(mission.assignedAgentId);
                    const sprint = sprintName(mission.sprintId);
                    return (
                      <div key={mission.id}
                        draggable
                        onDragStart={e => onDragStart(e, mission.id)}
                        onDragEnd={onDragEnd}
                        className={cn(
                          "bg-card border border-border p-3 space-y-2 cursor-grab active:cursor-grabbing",
                          "hover:border-primary/40 transition-all group",
                          isDragging ? "opacity-30 scale-95" : "opacity-100"
                        )}>
                        {/* Priority + drag handle */}
                        <div className="flex items-start justify-between gap-1">
                          <span className={cn("text-[10px] font-mono font-bold border px-1.5 py-0.5 shrink-0", priorityColor[mission.priority])}>
                            {mission.priority.toUpperCase()}
                          </span>
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 transition-colors" />
                        </div>

                        {/* Title */}
                        <div className="text-sm font-medium leading-snug">{mission.title}</div>

                        {/* Category */}
                        <div className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 inline-block">
                          {mission.category}
                        </div>

                        {/* Meta */}
                        <div className="space-y-1 pt-1 border-t border-border">
                          {agent && (
                            <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                              <span className="text-primary/60">●</span>{agent}
                            </div>
                          )}
                          {sprint && (
                            <div className="text-[10px] font-mono text-accent/70 truncate">⚡ {sprint}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colMissions.length === 0 && (
                    <div className={cn("border border-dashed text-center py-8 text-[10px] font-mono text-muted-foreground/50 transition-colors",
                      isOver ? "border-primary/50 text-primary/50" : "border-border/50")}>
                      {isOver ? "DROP HERE" : "EMPTY"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="space-y-3">
          {statusFilter && (
            <div className="flex items-center gap-2 text-xs font-mono text-primary">
              <Filter className="h-3 w-3" />FILTERING: {statusFilter.toUpperCase()}
              <button onClick={() => setStatusFilter("")} className="text-muted-foreground hover:text-foreground ml-2">[CLEAR]</button>
            </div>
          )}
          {filteredMissions.isLoading ? (
            <div className="text-sm font-mono text-muted-foreground">LOADING MISSIONS...</div>
          ) : (
            filteredMissions.data?.map(mission => (
              <div key={mission.id} className="bg-card border border-border p-4 flex items-start gap-4 hover:border-primary/30 transition-colors">
                <div className="mt-0.5 shrink-0">{statusIcon[mission.status]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-sm">{mission.title}</span>
                    <span className={cn("text-xs font-mono border px-1.5 py-0.5", priorityColor[mission.priority])}>
                      {mission.priority.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground border border-border px-1.5 py-0.5">{mission.category}</span>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1 mb-1">{mission.description}</div>
                  <div className="flex gap-3 text-xs font-mono text-muted-foreground">
                    <span>AGENT: <span className="text-foreground">{agentName(mission.assignedAgentId) ?? "UNASSIGNED"}</span></span>
                    {mission.sprintId && <span>SPRINT: <span className="text-accent">{sprintName(mission.sprintId) ?? `#${mission.sprintId}`}</span></span>}
                  </div>
                </div>
                <select
                  className="shrink-0 bg-background border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                  value={mission.status}
                  onChange={e => handleStatusChange(mission.id, e.target.value)}>
                  <option value="pending">PENDING</option>
                  <option value="active">ACTIVE</option>
                  <option value="complete">COMPLETE</option>
                  <option value="failed">FAILED</option>
                </select>
              </div>
            ))
          )}
          {filteredMissions.data?.length === 0 && !filteredMissions.isLoading && (
            <div className="text-center py-12 text-muted-foreground font-mono text-sm">
              <Target className="h-8 w-8 mx-auto mb-3 opacity-30" />NO MISSIONS FOUND
            </div>
          )}
        </div>
      )}
    </div>
  );
}
