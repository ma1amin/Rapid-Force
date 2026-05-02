import { useState } from "react";
import { useListIncidents, useGetIncidentsSummary, useCreateIncident, useUpdateIncident, useListAgents, getListIncidentsQueryKey, getGetIncidentsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Siren, PlusCircle, AlertTriangle, Search, Shield, CheckCircle2, Activity, Clock, ChevronDown, ChevronUp } from "lucide-react";

const REFETCH_MS = 30_000;

const severityColor: Record<string, string> = {
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  high: "text-accent border-accent/40 bg-accent/10",
  medium: "text-primary border-primary/40 bg-primary/10",
  low: "text-muted-foreground border-border",
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  open: { icon: <AlertTriangle className="h-3 w-3" />, color: "text-destructive", label: "OPEN" },
  investigating: { icon: <Search className="h-3 w-3" />, color: "text-accent", label: "INVESTIGATING" },
  contained: { icon: <Shield className="h-3 w-3" />, color: "text-primary", label: "CONTAINED" },
  eradicated: { icon: <CheckCircle2 className="h-3 w-3" />, color: "text-primary/70", label: "ERADICATED" },
  closed: { icon: <CheckCircle2 className="h-3 w-3" />, color: "text-muted-foreground", label: "CLOSED" },
};

const typeLabel: Record<string, string> = {
  malware: "MALWARE",
  ransomware: "RANSOMWARE",
  phishing: "PHISHING",
  insider_threat: "INSIDER THREAT",
  data_breach: "DATA BREACH",
  supply_chain: "SUPPLY CHAIN",
  ddos: "DDoS",
  zero_day: "ZERO-DAY",
  lateral_movement: "LATERAL MOVEMENT",
  privilege_escalation: "PRIV ESC",
  other: "OTHER",
};

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Incidents() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", severity: "high", type: "other",
    affectedSystems: "", iocIndicators: "", attackVector: "", mitreTechnique: "", assignedAgentId: ""
  });

  const { data: incidents, isLoading } = useListIncidents({ query: { refetchInterval: REFETCH_MS } });
  const { data: summary } = useGetIncidentsSummary({ query: { refetchInterval: REFETCH_MS } });
  const { data: agents } = useListAgents({ query: { refetchInterval: REFETCH_MS } });

  const createIncident = useCreateIncident({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetIncidentsSummaryQueryKey() });
        setShowForm(false);
        setForm({ title: "", description: "", severity: "high", type: "other", affectedSystems: "", iocIndicators: "", attackVector: "", mitreTechnique: "", assignedAgentId: "" });
      },
    },
  });

  const updateIncident = useUpdateIncident({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetIncidentsSummaryQueryKey() });
      },
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createIncident.mutate({
      data: {
        ...form,
        ...(form.assignedAgentId ? { assignedAgentId: Number(form.assignedAgentId) } : {}),
      } as any,
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateIncident.mutate({ id, data: { status: status as any } });
  };

  const agentName = (id: number | null | undefined) =>
    id ? agents?.find(a => a.id === id)?.name ?? `AGT-${id}` : "UNASSIGNED";

  const filtered = incidents?.filter(i => !statusFilter || i.status === statusFilter) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // INCIDENT RESPONSE</div>
          <h1 className="text-2xl font-bold tracking-wider">INCIDENT RESPONSE</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 border border-destructive px-4 py-2 text-sm font-mono text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          OPEN INCIDENT
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: "TOTAL", value: summary.total },
            { label: "OPEN", value: summary.open, cls: "text-destructive", filter: "open" },
            { label: "INVESTIGATING", value: summary.investigating, cls: "text-accent", filter: "investigating" },
            { label: "CONTAINED", value: summary.contained, cls: "text-primary", filter: "contained" },
            { label: "CLOSED", value: summary.closed, cls: "text-muted-foreground", filter: "closed" },
            { label: "CRITICAL", value: summary.critical, cls: "text-destructive" },
            { label: "HIGH", value: summary.high, cls: "text-accent" },
          ].map(({ label, value, cls = "text-foreground", filter }) => (
            <div
              key={label}
              className={`bg-card border p-3 flex-1 min-w-20 transition-colors ${filter ? "cursor-pointer" : ""} ${statusFilter === filter ? "border-primary" : "border-border hover:border-muted-foreground"}`}
              onClick={() => filter && setStatusFilter(statusFilter === filter ? "" : filter)}
            >
              <div className="text-xs font-mono text-muted-foreground">{label}</div>
              <div className={`text-xl font-bold font-mono mt-1 ${cls}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {statusFilter && (
        <div className="flex items-center gap-2 text-xs font-mono text-primary">
          <Activity className="h-3 w-3" />
          FILTER: {statusFilter.toUpperCase()}
          <button onClick={() => setStatusFilter("")} className="text-muted-foreground hover:text-foreground ml-2">[CLEAR]</button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-destructive p-5 space-y-4">
          <div className="text-xs font-mono text-destructive tracking-widest">OPEN NEW INCIDENT</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-muted-foreground mb-1">TITLE</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Incident title" required />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">SEVERITY</label>
              <select className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                <option value="critical">CRITICAL</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">TYPE</label>
              <select className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {Object.entries(typeLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">ASSIGN AGENT</label>
              <select className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.assignedAgentId} onChange={e => setForm({ ...form, assignedAgentId: e.target.value })}>
                <option value="">UNASSIGNED</option>
                {agents?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">MITRE TECHNIQUE</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.mitreTechnique} onChange={e => setForm({ ...form, mitreTechnique: e.target.value })} placeholder="T1486, T1490" />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-mono text-muted-foreground mb-1">DESCRIPTION</label>
              <textarea className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary resize-none"
                rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Incident briefing..." required />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">AFFECTED SYSTEMS</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.affectedSystems} onChange={e => setForm({ ...form, affectedSystems: e.target.value })} placeholder="server-01, db-02" />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">IOC INDICATORS</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.iocIndicators} onChange={e => setForm({ ...form, iocIndicators: e.target.value })} placeholder="IPs, domains, hashes" />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">ATTACK VECTOR</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.attackVector} onChange={e => setForm({ ...form, attackVector: e.target.value })} placeholder="Phishing → persistence" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createIncident.isPending} className="px-4 py-2 bg-destructive text-destructive-foreground text-sm font-mono hover:opacity-90 disabled:opacity-50">
              {createIncident.isPending ? "OPENING..." : "OPEN INCIDENT"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border text-sm font-mono text-muted-foreground hover:text-foreground">
              CANCEL
            </button>
          </div>
        </form>
      )}

      {/* Incident list */}
      {isLoading ? (
        <div className="text-sm font-mono text-muted-foreground">LOADING INCIDENTS...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((incident) => {
            const sc = statusConfig[incident.status] ?? statusConfig.open;
            const isExpanded = expandedId === incident.id;
            const playbookSteps = incident.playbookSteps?.split("\n").filter(Boolean) ?? [];

            return (
              <div key={incident.id} className="bg-card border border-border hover:border-primary/30 transition-colors">
                <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : incident.id)}>
                  <div className="flex items-start gap-3 justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Siren className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className="font-medium text-sm">{incident.title}</span>
                          <span className={`text-xs font-mono border px-1.5 py-0.5 ${severityColor[incident.severity]}`}>{incident.severity.toUpperCase()}</span>
                          <span className="text-xs font-mono border border-border px-1.5 py-0.5 text-muted-foreground">{typeLabel[incident.type] ?? incident.type}</span>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{incident.description}</div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs font-mono text-muted-foreground">
                          <span className={`flex items-center gap-1 ${sc.color}`}>{sc.icon} {sc.label}</span>
                          <span>AGENT: <span className="text-foreground">{agentName(incident.assignedAgentId)}</span></span>
                          {incident.timeToDetect && <span>TTD: <span className="text-accent">{incident.timeToDetect}m</span></span>}
                          <span className="ml-auto">{timeAgo(incident.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <select
                        className={`text-xs font-mono border px-2 py-1 bg-transparent focus:outline-none cursor-pointer ${sc.color}`}
                        value={incident.status}
                        onChange={e => handleStatusChange(incident.id, e.target.value)}
                      >
                        <option value="open">OPEN</option>
                        <option value="investigating">INVESTIGATING</option>
                        <option value="contained">CONTAINED</option>
                        <option value="eradicated">ERADICATED</option>
                        <option value="closed">CLOSED</option>
                      </select>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {incident.affectedSystems && (
                        <div>
                          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1.5">AFFECTED SYSTEMS</div>
                          <div className="text-xs font-mono text-foreground bg-background border border-border px-3 py-2">
                            {incident.affectedSystems}
                          </div>
                        </div>
                      )}
                      {incident.iocIndicators && (
                        <div>
                          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1.5">IOC INDICATORS</div>
                          <div className="text-xs font-mono text-destructive bg-background border border-border px-3 py-2">
                            {incident.iocIndicators}
                          </div>
                        </div>
                      )}
                      {incident.attackVector && (
                        <div>
                          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1.5">ATTACK VECTOR</div>
                          <div className="text-xs font-mono text-foreground bg-background border border-border px-3 py-2">
                            {incident.attackVector}
                          </div>
                        </div>
                      )}
                      {incident.mitreTechnique && (
                        <div>
                          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1.5">MITRE ATT&CK</div>
                          <div className="text-xs font-mono text-primary bg-background border border-border px-3 py-2">
                            {incident.mitreTechnique}
                          </div>
                        </div>
                      )}
                      {incident.containmentActions && (
                        <div className="sm:col-span-2">
                          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1.5">CONTAINMENT ACTIONS</div>
                          <div className="text-xs font-mono text-foreground bg-background border border-border px-3 py-2">
                            {incident.containmentActions}
                          </div>
                        </div>
                      )}
                    </div>

                    {playbookSteps.length > 0 && (
                      <div>
                        <div className="text-xs font-mono text-muted-foreground tracking-widest mb-2">RESPONSE PLAYBOOK</div>
                        <div className="space-y-1">
                          {playbookSteps.map((step, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs font-mono">
                              <span className="text-primary shrink-0">{String(i + 1).padStart(2, "0")}.</span>
                              <span className="text-foreground">{step.replace(/^\d+\.\s*/, "")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 font-mono text-sm text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-3 opacity-30 text-primary" />
              {statusFilter ? `NO ${statusFilter.toUpperCase()} INCIDENTS` : "NO INCIDENTS ON RECORD"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
