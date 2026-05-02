import { useState } from "react";
import { useListAgents, useGetAgentsSummary, useCreateAgent, useUpdateAgent, getListAgentsQueryKey, getGetAgentsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Cpu, PlusCircle, Activity, Clock, Radio, WifiOff } from "lucide-react";

const statusIcon: Record<string, React.ReactNode> = {
  active: <Activity className="h-3 w-3 text-primary" />,
  idle: <Clock className="h-3 w-3 text-muted-foreground" />,
  standby: <Radio className="h-3 w-3 text-accent" />,
  offline: <WifiOff className="h-3 w-3 text-destructive" />,
};

const statusBg: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/30",
  idle: "bg-muted text-muted-foreground border-border",
  standby: "bg-accent/10 text-accent border-accent/30",
  offline: "bg-destructive/10 text-destructive border-destructive/30",
};

const roleLabel: Record<string, string> = {
  architect: "ARCHITECT",
  cto: "CTO",
  product_manager: "PRODUCT MGR",
  security_lead: "SECURITY",
  senior_engineer: "SR ENGINEER",
  devops: "DEVOPS",
  ui_ux: "UI/UX",
  red_team: "RED TEAM",
  documentation: "DOCUMENTATION",
};

export default function Agents() {
  const qc = useQueryClient();
  const { data: agents, isLoading } = useListAgents();
  const { data: summary } = useGetAgentsSummary();
  const createAgent = useCreateAgent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetAgentsSummaryQueryKey() });
        setShowForm(false);
        setForm({ name: "", role: "senior_engineer", module: "" });
      },
    },
  });
  const updateAgent = useUpdateAgent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetAgentsSummaryQueryKey() });
      },
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: "senior_engineer", module: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.module) return;
    createAgent.mutate({ data: { name: form.name, role: form.role as any, module: form.module } });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateAgent.mutate({ id, data: { status: status as any } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // AGENT MANAGEMENT</div>
          <h1 className="text-2xl font-bold tracking-wider">AGENT FLEET</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 border border-primary px-4 py-2 text-sm font-mono text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          REGISTER AGENT
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 [&>*]:flex-1 [&>*]:min-w-28">
        {[
          { label: "TOTAL", value: summary?.total ?? "—" },
          { label: "ACTIVE", value: summary?.active ?? "—", accent: true },
          { label: "IDLE", value: summary?.idle ?? "—" },
          { label: "STANDBY", value: summary?.standby ?? "—", warn: true },
          { label: "OFFLINE", value: summary?.offline ?? "—", danger: true },
          { label: "MISSIONS", value: summary?.totalMissionsCompleted ?? "—", accent: true },
        ].map(({ label, value, accent, warn, danger }) => (
          <div key={label} className="bg-card border border-border p-3">
            <div className="text-xs font-mono text-muted-foreground">{label}</div>
            <div className={`text-xl font-bold font-mono mt-1 ${danger ? "text-destructive" : warn ? "text-accent" : accent ? "text-primary" : "text-foreground"}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-primary p-5 space-y-4">
          <div className="text-xs font-mono text-primary tracking-widest">REGISTER NEW AGENT</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">AGENT NAME</label>
              <input
                type="text"
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ENG-3"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">ROLE</label>
              <select
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {Object.entries(roleLabel).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">MODULE</label>
              <input
                type="text"
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                placeholder="Module name"
                required
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createAgent.isPending} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-mono hover:opacity-90 transition-opacity disabled:opacity-50">
              {createAgent.isPending ? "DEPLOYING..." : "DEPLOY AGENT"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">
              CANCEL
            </button>
          </div>
        </form>
      )}

      {/* Agents grid */}
      {isLoading ? (
        <div className="text-sm font-mono text-muted-foreground">LOADING FLEET...</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents?.map((agent) => (
            <div key={agent.id} className="bg-card border border-border p-4 space-y-3 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-bold tracking-wide">{agent.name}</span>
                </div>
                <span className={`flex items-center gap-1 text-xs font-mono border px-2 py-0.5 ${statusBg[agent.status]}`}>
                  {statusIcon[agent.status]}
                  {agent.status.toUpperCase()}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono text-muted-foreground">{roleLabel[agent.role]}</div>
                <div className="text-xs text-foreground/70 truncate">{agent.module}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground">MISSIONS: </span>
                  <span className="text-primary">{agent.missionsCompleted}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">ACTIVE: </span>
                  <span className="text-foreground">{agent.tasksActive}</span>
                </div>
              </div>
              <div className="pt-1 border-t border-border">
                <select
                  className="w-full bg-background border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                  value={agent.status}
                  onChange={(e) => handleStatusChange(agent.id, e.target.value)}
                >
                  <option value="active">ACTIVE</option>
                  <option value="idle">IDLE</option>
                  <option value="standby">STANDBY</option>
                  <option value="offline">OFFLINE</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
