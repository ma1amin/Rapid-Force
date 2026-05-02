import { useState } from "react";
import { useListDetections, useGetDetectionsSummary, useCreateDetection, useUpdateDetection, getListDetectionsQueryKey, getGetDetectionsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FileCode2, PlusCircle, Shield, AlertTriangle, Eye, EyeOff, FlaskConical, CheckCircle2, Code2, Network, Brain, FileSearch } from "lucide-react";

const REFETCH_MS = 30_000;

const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  sigma: { icon: <FileCode2 className="h-3 w-3" />, label: "SIGMA", color: "text-primary border-primary/30 bg-primary/10" },
  yara: { icon: <Code2 className="h-3 w-3" />, label: "YARA", color: "text-accent border-accent/30 bg-accent/10" },
  query: { icon: <FileSearch className="h-3 w-3" />, label: "QUERY", color: "text-muted-foreground border-border" },
  ioc: { icon: <Network className="h-3 w-3" />, label: "IOC", color: "text-destructive border-destructive/30 bg-destructive/10" },
  behavioral: { icon: <Brain className="h-3 w-3" />, label: "BEHAVIORAL", color: "text-accent border-accent/20 bg-accent/5" },
};

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  active: { icon: <CheckCircle2 className="h-3 w-3" />, label: "ACTIVE", color: "text-primary" },
  testing: { icon: <FlaskConical className="h-3 w-3" />, label: "TESTING", color: "text-accent" },
  review: { icon: <Eye className="h-3 w-3" />, label: "REVIEW", color: "text-muted-foreground" },
  disabled: { icon: <EyeOff className="h-3 w-3" />, label: "DISABLED", color: "text-muted-foreground/50" },
};

const severityColor: Record<string, string> = {
  critical: "text-destructive border-destructive/30 bg-destructive/10",
  high: "text-accent border-accent/30 bg-accent/10",
  medium: "text-primary border-primary/30 bg-primary/10",
  low: "text-muted-foreground border-border",
  informational: "text-muted-foreground/60 border-border",
};

const mitreColors: Record<string, string> = {
  "Credential Access": "bg-destructive/10 text-destructive",
  "Impact": "bg-destructive/10 text-destructive",
  "Execution": "bg-accent/10 text-accent",
  "Persistence": "bg-accent/10 text-accent",
  "Lateral Movement": "bg-primary/10 text-primary",
  "Command and Control": "bg-primary/10 text-primary",
  "Exfiltration": "bg-primary/10 text-primary",
  "Defense Evasion": "bg-muted text-muted-foreground",
  "Privilege Escalation": "bg-accent/10 text-accent",
  "Initial Access": "bg-accent/10 text-accent",
};

export default function Detections() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", type: "sigma", severity: "medium",
    ruleContent: "", mitreTechnique: "", mitreTactic: "", tags: "", author: ""
  });

  const { data: detections, isLoading } = useListDetections({ query: { refetchInterval: REFETCH_MS } });
  const { data: summary } = useGetDetectionsSummary({ query: { refetchInterval: REFETCH_MS } });

  const createDetection = useCreateDetection({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListDetectionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDetectionsSummaryQueryKey() });
        setShowForm(false);
        setForm({ name: "", description: "", type: "sigma", severity: "medium", ruleContent: "", mitreTechnique: "", mitreTactic: "", tags: "", author: "" });
      },
    },
  });

  const updateDetection = useUpdateDetection({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListDetectionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDetectionsSummaryQueryKey() });
      },
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createDetection.mutate({ data: form as any });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateDetection.mutate({ id, data: { status: status as any } });
  };

  const filtered = detections?.filter(d => !typeFilter || d.type === typeFilter) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-1">RAPID FORCE // DETECTION ENGINEERING</div>
          <h1 className="text-2xl font-bold tracking-wider">DETECTION ENGINEERING</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 border border-primary px-4 py-2 text-sm font-mono text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          NEW RULE
        </button>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: "TOTAL RULES", value: summary.total },
            { label: "ACTIVE", value: summary.active, cls: "text-primary" },
            { label: "TESTING", value: summary.testing, cls: "text-accent" },
            { label: "REVIEW", value: summary.review, cls: "text-muted-foreground" },
            { label: "DISABLED", value: summary.disabled, cls: "text-muted-foreground/50" },
            { label: "SIGMA", value: summary.sigma, cls: "text-primary" },
            { label: "YARA", value: summary.yara, cls: "text-accent" },
            { label: "IOC", value: summary.ioc, cls: "text-destructive" },
          ].map(({ label, value, cls = "text-foreground" }) => (
            <div key={label} className="bg-card border border-border p-3 flex-1 min-w-20">
              <div className="text-xs font-mono text-muted-foreground">{label}</div>
              <div className={`text-xl font-bold font-mono mt-1 ${cls}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter("")}
          className={`flex items-center gap-1.5 text-xs font-mono border px-3 py-1.5 transition-colors ${!typeFilter ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
        >
          ALL
        </button>
        {Object.entries(typeConfig).map(([type, cfg]) => (
          <button
            key={type}
            onClick={() => setTypeFilter(typeFilter === type ? "" : type)}
            className={`flex items-center gap-1.5 text-xs font-mono border px-3 py-1.5 transition-colors ${typeFilter === type ? cfg.color : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
          >
            {cfg.icon} {cfg.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-primary p-5 space-y-4">
          <div className="text-xs font-mono text-primary tracking-widest">CREATE DETECTION RULE</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-muted-foreground mb-1">RULE NAME</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Sigma: ..." required />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">TYPE</label>
              <select className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {Object.entries(typeConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-muted-foreground mb-1">DESCRIPTION</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this rule detect?" required />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">SEVERITY</label>
              <select className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                <option value="critical">CRITICAL</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
                <option value="informational">INFORMATIONAL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">MITRE TECHNIQUE</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.mitreTechnique} onChange={e => setForm({ ...form, mitreTechnique: e.target.value })} placeholder="T1003.001" />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">MITRE TACTIC</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.mitreTactic} onChange={e => setForm({ ...form, mitreTactic: e.target.value })} placeholder="Credential Access" />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">AUTHOR</label>
              <input type="text" className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="SEC-1" />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-mono text-muted-foreground mb-1">RULE CONTENT</label>
              <textarea className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary resize-none"
                rows={6} value={form.ruleContent} onChange={e => setForm({ ...form, ruleContent: e.target.value })} placeholder="Sigma YAML / YARA rule / IOC list..." required />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createDetection.isPending} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-mono hover:opacity-90 disabled:opacity-50">
              {createDetection.isPending ? "DEPLOYING..." : "DEPLOY RULE"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border text-sm font-mono text-muted-foreground hover:text-foreground">
              CANCEL
            </button>
          </div>
        </form>
      )}

      {/* Detections list */}
      {isLoading ? (
        <div className="text-sm font-mono text-muted-foreground">LOADING DETECTION RULES...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((detection) => {
            const tc = typeConfig[detection.type] ?? typeConfig.sigma;
            const sc = statusConfig[detection.status] ?? statusConfig.testing;
            const isExpanded = expandedId === detection.id;
            const tacticColor = mitreColors[detection.mitreTactic ?? ""] ?? "bg-muted text-muted-foreground";

            return (
              <div key={detection.id} className="bg-card border border-border hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : detection.id)}>
                  <div className="mt-0.5 shrink-0">{tc.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="font-medium text-sm">{detection.name}</span>
                      <span className={`text-xs font-mono border px-1.5 py-0.5 ${severityColor[detection.severity]}`}>{detection.severity.toUpperCase()}</span>
                      <span className={`flex items-center gap-1 text-xs font-mono border px-1.5 py-0.5 ${tc.color}`}>{tc.icon} {tc.label}</span>
                      {detection.mitreTechnique && (
                        <span className="text-xs font-mono bg-background border border-border px-1.5 py-0.5">{detection.mitreTechnique}</span>
                      )}
                      {detection.mitreTactic && (
                        <span className={`text-xs font-mono px-1.5 py-0.5 ${tacticColor}`}>{detection.mitreTactic}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{detection.description}</div>
                    <div className="flex gap-3 mt-1 text-xs font-mono text-muted-foreground">
                      <span>TP: <span className="text-primary">{detection.truePositiveCount}</span></span>
                      <span>FP rate: <span className="text-foreground">{detection.falsePositiveRate}%</span></span>
                      {detection.author && <span>BY: <span className="text-foreground">{detection.author}</span></span>}
                    </div>
                  </div>
                  <div className="shrink-0" onClick={e => e.stopPropagation()}>
                    <select
                      className={`text-xs font-mono border px-2 py-1 bg-transparent focus:outline-none cursor-pointer ${sc.color}`}
                      value={detection.status}
                      onChange={e => handleStatusChange(detection.id, e.target.value)}
                    >
                      <option value="active">ACTIVE</option>
                      <option value="testing">TESTING</option>
                      <option value="review">REVIEW</option>
                      <option value="disabled">DISABLED</option>
                    </select>
                  </div>
                </div>

                {/* Expanded rule content */}
                {isExpanded && (
                  <div className="border-t border-border mx-4 mb-4">
                    <div className="text-xs font-mono text-muted-foreground mt-3 mb-2 tracking-widest">RULE CONTENT</div>
                    <pre className="bg-background border border-border p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {detection.ruleContent}
                    </pre>
                    {detection.tags && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {detection.tags.split(",").map(tag => (
                          <span key={tag.trim()} className="text-xs font-mono bg-background border border-border px-2 py-0.5 text-muted-foreground">
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 font-mono text-sm text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-3 opacity-30" />
              NO DETECTION RULES FOUND
            </div>
          )}
        </div>
      )}
    </div>
  );
}
