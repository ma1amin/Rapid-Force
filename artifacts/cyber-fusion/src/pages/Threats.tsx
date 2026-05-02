import { useState } from "react";
import { useListThreats, useCreateThreat, useUpdateThreat, useGetThreatsSummary, getListThreatsQueryKey, getGetThreatsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, PlusCircle, AlertTriangle, Shield, Eye, XCircle } from "lucide-react";

const REFETCH_MS = 30_000;

const severityColor: Record<string, string> = {
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  high: "text-accent border-accent/40 bg-accent/10",
  medium: "text-primary border-primary/40 bg-primary/10",
  low: "text-muted-foreground border-border",
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  active: { icon: <AlertTriangle className="h-3 w-3" />, color: "text-destructive border-destructive/30 bg-destructive/10", label: "ACTIVE" },
  monitoring: { icon: <Eye className="h-3 w-3" />, color: "text-accent border-accent/30 bg-accent/10", label: "MONITORING" },
  mitigated: { icon: <Shield className="h-3 w-3" />, color: "text-primary border-primary/30 bg-primary/10", label: "MITIGATED" },
  closed: { icon: <XCircle className="h-3 w-3" />, color: "text-muted-foreground border-border", label: "CLOSED" },
};

export default function Threats() {
  const qc = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const { data: threats, isLoading } = useListThreats(
    severityFilter ? { severity: severityFilter as any } : {},
    { query: { queryKey: getListThreatsQueryKey(severityFilter ? { severity: severityFilter as any } : {}), refetchInterval: REFETCH_MS } }
  );
  const { data: summary } = useGetThreatsSummary({ query: { refetchInterval: REFETCH_MS } });

  const createThreat = useCreateThreat({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListThreatsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetThreatsSummaryQueryKey() });
        setShowForm(false);
        setForm({ title: "", description: "", severity: "medium", category: "", source: "" });
      },
    },
  });

  const updateThreat = useUpdateThreat({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListThreatsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetThreatsSummaryQueryKey() });
      },
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "medium", category: "", source: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createThreat.mutate({ data: form as any });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateThreat.mutate({ id, data: { status: status as any } });
  };

  const sorted = [...(threats ?? [])].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity as keyof typeof order] ?? 4) - (order[b.severity as keyof typeof order] ?? 4);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // THREAT INTELLIGENCE</div>
          <h1 className="text-2xl font-bold tracking-wider">THREAT INTEL</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 border border-destructive px-4 py-2 text-sm font-mono text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          LOG THREAT
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: "TOTAL", value: summary.total },
            { label: "CRITICAL", value: summary.critical, cls: "text-destructive cursor-pointer", filter: "critical" },
            { label: "HIGH", value: summary.high, cls: "text-accent cursor-pointer", filter: "high" },
            { label: "MEDIUM", value: summary.medium, cls: "text-primary cursor-pointer", filter: "medium" },
            { label: "LOW", value: summary.low, cls: "text-muted-foreground cursor-pointer", filter: "low" },
            { label: "ACTIVE", value: summary.active, cls: "text-destructive" },
            { label: "MITIGATED", value: summary.mitigated, cls: "text-primary" },
          ].map(({ label, value, cls = "text-foreground", filter }) => (
            <div
              key={label}
              className={`bg-card border p-3 flex-1 min-w-16 transition-colors ${severityFilter === filter ? "border-primary" : "border-border hover:border-muted-foreground"} ${filter ? "cursor-pointer" : ""}`}
              onClick={() => filter && setSeverityFilter(severityFilter === filter ? "" : filter)}
            >
              <div className="text-xs font-mono text-muted-foreground">{label}</div>
              <div className={`text-2xl font-bold font-mono mt-1 ${cls}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {severityFilter && (
        <div className="flex items-center gap-2 text-xs font-mono text-primary">
          FILTERING SEVERITY: {severityFilter.toUpperCase()}
          <button onClick={() => setSeverityFilter("")} className="text-muted-foreground hover:text-foreground ml-2">[CLEAR]</button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-destructive p-5 space-y-4">
          <div className="text-xs font-mono text-destructive tracking-widest">LOG NEW THREAT</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">TITLE</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Threat name / CVE" required />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">SEVERITY</label>
              <select className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                <option value="critical">CRITICAL</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">CATEGORY</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="CVE / Supply Chain / ..." required />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">SOURCE</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="NVD Feed / Red Team / ..." required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-muted-foreground mb-1">DESCRIPTION</label>
              <textarea className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary resize-none"
                rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Threat details..." required />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createThreat.isPending} className="px-4 py-2 bg-destructive text-destructive-foreground text-sm font-mono hover:opacity-90 disabled:opacity-50">
              {createThreat.isPending ? "LOGGING..." : "LOG THREAT"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border text-sm font-mono text-muted-foreground hover:text-foreground">
              CANCEL
            </button>
          </div>
        </form>
      )}

      {/* Threat list */}
      {isLoading ? (
        <div className="text-sm font-mono text-muted-foreground">SCANNING THREAT DATABASE...</div>
      ) : (
        <div className="space-y-2">
          {sorted.map((threat) => {
            const sc = statusConfig[threat.status];
            return (
              <div key={threat.id} className="bg-card border border-border p-4 space-y-3 hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-3 justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm">{threat.title}</span>
                        <span className={`text-xs font-mono border px-1.5 py-0.5 ${severityColor[threat.severity]}`}>
                          {threat.severity.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground border border-border px-1.5 py-0.5">{threat.category}</span>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{threat.description}</div>
                    </div>
                  </div>
                  {/* Inline status selector */}
                  <div className="shrink-0">
                    <select
                      className={`text-xs font-mono border px-2 py-1 bg-transparent focus:outline-none cursor-pointer ${sc.color}`}
                      value={threat.status}
                      onChange={(e) => handleStatusChange(threat.id, e.target.value)}
                    >
                      <option value="active">ACTIVE</option>
                      <option value="monitoring">MONITORING</option>
                      <option value="mitigated">MITIGATED</option>
                      <option value="closed">CLOSED</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 text-xs font-mono text-muted-foreground pl-7">
                  <span>SOURCE: <span className="text-foreground">{threat.source}</span></span>
                  <span>DETECTED: <span className="text-foreground">{new Date(threat.detectedAt).toLocaleDateString()}</span></span>
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div className="text-center py-12 font-mono text-sm text-muted-foreground">
              <ShieldAlert className="h-8 w-8 mx-auto mb-3 opacity-30" />
              NO THREATS FOUND
            </div>
          )}
        </div>
      )}
    </div>
  );
}
