import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Code2, GitBranch, ArrowRight, RefreshCcw, Loader2, Clock, CheckCircle, AlertTriangle, Plus, Play, Upload, Tag, X, Download, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const RuleEditor = lazy(() => import("@/components/editor/RuleEditor"));

interface Detection {
  id: number; name: string; type: string; severity: string; status: string;
  ruleContent: string; mitreTechnique: string | null; mitreTactic: string | null;
  tags: string | null; author: string | null; version: string | null; description: string;
}

interface RuleVersion {
  id: number; detectionId: number; version: string; ruleContent: string;
  stage: string; changelog: string; author: string; isCurrent: boolean; createdAt: string;
}

interface CommunityRule {
  name: string; type: string; severity: string; mitreTechnique: string; mitreTactic: string;
  description: string; ruleContent: string; author: string; tags: string;
  source: string; version: string;
}

interface UpdateInfo {
  lastChecked: string; available: number;
  sources: Record<string, { url: string; newRules: number }>;
  updates: Array<{ source: string; name: string; type: string; severity: string; mitreTechnique: string; version: string; publishedAt: string }>;
}

const STAGE_COLS = [
  { key: "draft",      label: "DRAFT",      color: "text-muted-foreground", bg: "border-border",           icon: Code2 },
  { key: "review",     label: "REVIEW",     color: "text-yellow-400",        bg: "border-yellow-500/30",    icon: AlertTriangle },
  { key: "test",       label: "TESTING",    color: "text-blue-400",          bg: "border-blue-500/30",      icon: Play },
  { key: "production", label: "PRODUCTION", color: "text-primary",           bg: "border-primary/30",       icon: CheckCircle },
] as const;

const SEV_COLORS: Record<string, string> = {
  critical: "text-red-400 border-red-500/40 bg-red-500/10",
  high:     "text-orange-400 border-orange-500/40 bg-orange-500/10",
  medium:   "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
  low:      "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  informational: "text-muted-foreground border-border",
};

const TYPE_COLORS: Record<string, string> = {
  sigma: "text-blue-400 border-blue-500/40 bg-blue-500/10",
  yara:  "text-purple-400 border-purple-500/40 bg-purple-500/10",
  query: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
  ioc:   "text-orange-400 border-orange-500/40 bg-orange-500/10",
  behavioral: "text-pink-400 border-pink-500/40 bg-pink-500/10",
};

const SOURCE_COLORS: Record<string, string> = {
  "SigmaHQ": "text-blue-400 border-blue-500/30",
  "YARA-Forge": "text-purple-400 border-purple-500/30",
  "signature-base": "text-orange-400 border-orange-500/30",
  "JPCERT/CC": "text-red-400 border-red-500/30",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const TABS = ["Pipeline", "Community Library", "Version History"] as const;

export default function DetectionIDE() {
  const { toast } = useToast();
  const [board, setBoard]         = useState<Record<string, Detection[]>>({ draft: [], review: [], test: [], production: [] });
  const [community, setCommunity] = useState<CommunityRule[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<typeof TABS[number]>("Pipeline");
  const [selected, setSelected]   = useState<Detection | null>(null);
  const [versions, setVersions]   = useState<RuleVersion[]>([]);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [advancing, setAdvancing] = useState<number | null>(null);
  const [commitOpen, setCommitOpen]   = useState(false);
  const [communityOpen, setCommunityOpen] = useState<CommunityRule | null>(null);
  const [selectedVersionTab, setSelectedVersionTab] = useState<string | null>(null);
  const [editedRule, setEditedRule] = useState("");
  const [changelog, setChangelog]   = useState("");
  const [committing, setCommitting] = useState(false);
  const [importing, setImporting]   = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [communityFilter, setCommunityFilter] = useState<"all" | "sigma" | "yara">("all");
  const [communitySource, setCommunitySource] = useState("All");

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        fetch(`${BASE}/api/rule-pipeline/board`, { credentials: "include" }),
        fetch(`${BASE}/api/rule-pipeline/community`, { credentials: "include" }),
      ]);
      const [bData, cData] = await Promise.all([bRes.json(), cRes.json()]);
      if (bData && typeof bData === "object" && !bData.error) setBoard(bData);
      setCommunity(Array.isArray(cData) ? cData : []);
    } catch { toast({ title: "Failed to load pipeline", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const advance = async (id: number) => {
    setAdvancing(id);
    try {
      const res = await fetch(`${BASE}/api/rule-pipeline/${id}/advance`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error();
      await loadBoard();
      toast({ title: "Rule advanced in pipeline" });
    } catch { toast({ title: "Failed to advance", variant: "destructive" }); }
    finally { setAdvancing(null); }
  };

  const loadVersions = async (id: number) => {
    try {
      const res = await fetch(`${BASE}/api/rule-pipeline/${id}/versions`, { credentials: "include" });
      const data = await res.json();
      setVersions(Array.isArray(data) ? data : []);
    } catch { setVersions([]); }
  };

  const selectDetection = async (d: Detection) => {
    setSelected(d);
    setEditedRule(d.ruleContent);
    setVersionsOpen(false);
    setTab("Version History");
    setSelectedVersionTab(d.name);
    await loadVersions(d.id);
  };

  const commitVersion = async () => {
    if (!selected || !editedRule || !changelog) return;
    setCommitting(true);
    try {
      await fetch(`${BASE}/api/rule-pipeline/${selected.id}/version`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleContent: editedRule, changelog, author: "SOC Engineer" }),
      });
      await loadBoard();
      await loadVersions(selected.id);
      setCommitOpen(false);
      setChangelog("");
      toast({ title: "New version committed", description: "Rule moved back to Draft for re-review." });
    } catch { toast({ title: "Commit failed", variant: "destructive" }); }
    finally { setCommitting(false); }
  };

  const importCommunityRule = async (rule: CommunityRule) => {
    setImporting(true);
    try {
      const res = await fetch(`${BASE}/api/detections`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rule.name, description: rule.description, type: rule.type,
          severity: rule.severity, ruleContent: rule.ruleContent,
          mitreTechnique: rule.mitreTechnique, mitreTactic: rule.mitreTactic,
          tags: rule.tags, author: rule.author, status: "disabled",
        }),
      });
      if (!res.ok) throw new Error();
      await loadBoard();
      setCommunityOpen(null);
      setTab("Pipeline");
      toast({ title: "Rule imported to Draft", description: "Switch to Pipeline to advance it." });
    } catch { toast({ title: "Import failed", variant: "destructive" }); }
    finally { setImporting(false); }
  };

  const checkUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const res = await fetch(`${BASE}/api/rule-pipeline/check-updates`, { credentials: "include" });
      const data = await res.json();
      setUpdateInfo(data);
      setUpdateOpen(true);
    } catch { toast({ title: "Update check failed", variant: "destructive" }); }
    finally { setCheckingUpdates(false); }
  };

  const stageOf = (d: Detection) => d.status === "active" ? "production" : d.status === "testing" ? "test" : d.status === "review" ? "review" : "draft";
  const nextStageLabel = (d: Detection) => ({ disabled: "→ REVIEW", review: "→ TEST", testing: "→ PRODUCTION", active: "DEPLOYED" }[d.status] ?? "→ NEXT");

  const allSources = ["All", ...Array.from(new Set(community.map(r => r.source ?? "Other")))];
  const filteredCommunity = community.filter(r => {
    if (communityFilter !== "all" && r.type !== communityFilter) return false;
    if (communitySource !== "All" && r.source !== communitySource) return false;
    return true;
  });

  const totalRules = Object.values(board).flat().length;
  const versionHistoryList = Object.values(board).flat();

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold tracking-wider">DETECTION IDE</h1>
              <Badge variant="outline" className="text-xs font-mono text-primary border-primary/40 bg-primary/5 ml-1">{totalRules} RULES</Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-1">Detection-as-Code pipeline · Draft → Review → Test → Production</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs font-mono">
              {STAGE_COLS.map((col, i) => (
                <span key={col.key} className="flex items-center gap-1">
                  <span className={col.color}>{board[col.key]?.length ?? 0} {col.label}</span>
                  {i < STAGE_COLS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                </span>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={loadBoard} className="font-mono text-xs">
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />REFRESH
            </Button>
          </div>
        </div>
        <div className="flex gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-3 py-1 text-xs font-mono border transition-colors",
                tab === t ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>
              {t.toUpperCase()}
            </button>
          ))}
          {tab === "Community Library" && (
            <Button size="sm" variant="outline" onClick={checkUpdates} disabled={checkingUpdates}
              className="ml-auto h-7 font-mono text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
              {checkingUpdates ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Download className="h-3 w-3 mr-1" />}
              CHECK UPDATES
            </Button>
          )}
        </div>
      </div>

      {tab === "Pipeline" ? (
        <div className="flex flex-1 min-h-0">
          {/* Kanban Board */}
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="flex h-full min-h-0 gap-0">
                {STAGE_COLS.map(col => {
                  const ColIcon = col.icon;
                  const colItems = board[col.key] ?? [];
                  return (
                    <div key={col.key} className="flex flex-col w-64 shrink-0 border-r border-border last:border-r-0">
                      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted/10">
                        <ColIcon className={cn("h-4 w-4", col.color)} />
                        <span className={cn("text-xs font-mono font-bold", col.color)}>{col.label}</span>
                        <span className="ml-auto text-xs font-mono text-muted-foreground">{colItems.length}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {colItems.map(d => (
                          <div key={d.id}
                            onClick={() => selectDetection(d)}
                            className={cn("border bg-card p-3 cursor-pointer hover:border-primary/50 transition-all",
                              selected?.id === d.id ? "border-primary bg-primary/5" : "border-border")}>
                            <div className="text-xs font-medium mb-1.5 leading-tight">{d.name}</div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[d.type])}>{d.type.toUpperCase()}</Badge>
                              <Badge variant="outline" className={cn("text-xs", SEV_COLORS[d.severity])}>{d.severity.toUpperCase()}</Badge>
                            </div>
                            {d.mitreTechnique && (
                              <div className="text-xs font-mono text-muted-foreground mb-2">{d.mitreTechnique}</div>
                            )}
                            {d.status !== "active" && (
                              <Button size="sm" variant="outline"
                                className={cn("w-full h-6 text-xs font-mono mt-1", col.color)}
                                onClick={e => { e.stopPropagation(); advance(d.id); }}
                                disabled={advancing === d.id}>
                                {advancing === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><ArrowRight className="h-3 w-3 mr-1" />{nextStageLabel(d)}</>}
                              </Button>
                            )}
                          </div>
                        ))}
                        {colItems.length === 0 && (
                          <div className="text-center text-xs text-muted-foreground py-8 border border-dashed border-border">
                            {col.key === "draft" ? "Import rules from Community Library" : `No rules in ${col.label}`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rule Detail Panel */}
          {selected && (
            <div className="w-96 border-l border-border flex flex-col shrink-0">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/10 shrink-0">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-mono text-primary">RULE EDITOR</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-6 text-xs font-mono"
                    onClick={() => setCommitOpen(true)}>
                    <Upload className="h-3 w-3 mr-1" />COMMIT
                  </Button>
                  <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Rule Meta */}
              <div className="p-3 border-b border-border shrink-0">
                <div className="font-medium text-sm mb-1">{selected.name}</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[selected.type])}>{selected.type.toUpperCase()}</Badge>
                  <Badge variant="outline" className={cn("text-xs", SEV_COLORS[selected.severity])}>{selected.severity.toUpperCase()}</Badge>
                  <Badge variant="outline" className={cn("text-xs", stageOf(selected) === "production" ? "text-primary border-primary/40" : "text-muted-foreground border-border")}>
                    {stageOf(selected).toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{selected.description}</p>
                <div className="flex flex-wrap gap-3 text-xs font-mono text-muted-foreground">
                  {selected.mitreTechnique && <span className="text-primary">{selected.mitreTechnique}</span>}
                  {selected.author && <span>BY {selected.author.toUpperCase()}</span>}
                  {selected.version && <span>v{selected.version}</span>}
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 overflow-hidden min-h-0" style={{ minHeight: 180, maxHeight: 300 }}>
                <Suspense fallback={<div className="flex items-center justify-center h-32 text-muted-foreground text-xs"><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading editor...</div>}>
                  <RuleEditor type={selected.type} value={editedRule} onChange={setEditedRule} />
                </Suspense>
              </div>

              {/* Advance */}
              {selected.status !== "active" && (
                <div className="p-3 border-t border-border shrink-0">
                  <Button size="sm" className="w-full font-mono text-xs bg-primary text-primary-foreground"
                    onClick={() => advance(selected.id)} disabled={advancing === selected.id}>
                    {advancing === selected.id ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <ArrowRight className="h-3 w-3 mr-2" />}
                    {nextStageLabel(selected)}
                  </Button>
                </div>
              )}

              {/* Version History Section */}
              <div className="border-t border-border shrink-0">
                  <button
                  onClick={() => setVersionsOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-mono text-muted-foreground">VERSION HISTORY</span>
                    {versions.length > 0 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground border-border">{versions.length}</Badge>
                    )}
                  </div>
                  {versionsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                {versionsOpen && (
                  <div className="px-3 pb-3 max-h-48 overflow-y-auto space-y-2">
                    {versions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">No versions yet. Use COMMIT to save a new version.</p>
                    ) : versions.map(v => (
                      <div key={v.id} className={cn("border p-2.5", v.isCurrent ? "border-primary/40 bg-primary/5" : "border-border bg-muted/10")}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-bold text-primary">v{v.version}</span>
                          <div className="flex items-center gap-1.5">
                            {v.isCurrent && <Badge variant="outline" className="text-xs text-primary border-primary/40 py-0">CURRENT</Badge>}
                            <Badge variant="outline" className="text-xs text-muted-foreground py-0">{v.stage.toUpperCase()}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{v.changelog}</p>
                        <div className="text-xs font-mono text-muted-foreground opacity-70">{v.author} · {timeAgo(v.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : tab === "Community Library" ? (
        /* Community Library */
        <div className="flex flex-col flex-1 min-h-0">
          {/* Library Filter Bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/5 shrink-0 flex-wrap">
            <div className="flex gap-1">
              {(["all", "sigma", "yara"] as const).map(f => (
                <button key={f} onClick={() => setCommunityFilter(f)}
                  className={cn("px-2 py-0.5 text-xs font-mono border transition-colors",
                    communityFilter === f ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>
                  {f === "all" ? `ALL (${community.length})` : f === "sigma" ? `SIGMA (${community.filter(r => r.type === "sigma").length})` : `YARA (${community.filter(r => r.type === "yara").length})`}
                </button>
              ))}
            </div>
            <div className="h-4 border-l border-border mx-1" />
            <div className="flex gap-1">
              {allSources.map(src => (
                <button key={src} onClick={() => setCommunitySource(src)}
                  className={cn("px-2 py-0.5 text-xs font-mono border transition-colors",
                    communitySource === src
                      ? "border-primary text-primary bg-primary/10"
                      : `border-border hover:border-primary/40 ${src !== "All" ? (SOURCE_COLORS[src] ?? "text-muted-foreground") : "text-muted-foreground"}`)}>
                  {src}
                </button>
              ))}
            </div>
            <div className="ml-auto text-xs font-mono text-muted-foreground">{filteredCommunity.length} RULES</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-24"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredCommunity.map((rule, i) => (
                  <div key={i}
                    onClick={() => setCommunityOpen(rule)}
                    className="border border-border bg-card p-4 cursor-pointer hover:border-primary/50 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[rule.type] ?? "")}>{rule.type.toUpperCase()}</Badge>
                        <Badge variant="outline" className={cn("text-xs", SEV_COLORS[rule.severity] ?? "")}>{rule.severity.toUpperCase()}</Badge>
                      </div>
                      {rule.source && (
                        <span className={cn("text-xs font-mono border px-1.5 py-0.5", SOURCE_COLORS[rule.source] ?? "text-muted-foreground border-border")}>
                          {rule.source}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-sm mb-1">{rule.name}</div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{rule.description}</p>
                    <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                      <span className="text-primary">{rule.mitreTechnique}</span>
                      <span className="text-muted-foreground opacity-70">v{rule.version}</span>
                    </div>
                    {rule.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rule.tags.split(",").slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs font-mono border border-border px-1.5 py-0.5 text-muted-foreground flex items-center gap-1">
                            <Tag className="h-2.5 w-2.5" />{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/5 shrink-0">
            <div className="text-xs font-mono text-muted-foreground">VERSION HISTORY</div>
            <div className="text-xs font-mono text-muted-foreground">{versionHistoryList.length} RULES</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {versionHistoryList.map(rule => (
                <button
                  key={rule.id}
                  onClick={() => selectDetection(rule)}
                  className={cn("text-left border bg-card p-4 hover:border-primary/50 transition-all",
                    selectedVersionTab === rule.name ? "border-primary bg-primary/5" : "border-border")}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[rule.type])}>{rule.type.toUpperCase()}</Badge>
                    <Badge variant="outline" className={cn("text-xs", SEV_COLORS[rule.severity])}>{rule.severity.toUpperCase()}</Badge>
                  </div>
                  <div className="text-sm font-medium mb-1">{rule.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">{rule.version ?? "1.0"} · {rule.author ?? "system"}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Commit Dialog */}
      <Dialog open={commitOpen} onOpenChange={setCommitOpen}>
        <DialogContent className="bg-background border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">COMMIT NEW VERSION — {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1">CHANGELOG</label>
              <Textarea value={changelog} onChange={e => setChangelog(e.target.value)}
                placeholder="Describe what changed in this version..." className="font-mono text-xs min-h-16 resize-none" />
            </div>
            <p className="text-xs text-muted-foreground">Committing a new version resets the rule to Draft for re-review.</p>
            <Button onClick={commitVersion} disabled={committing || !changelog}
              className="w-full font-mono text-xs bg-primary text-primary-foreground">
              {committing ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" />COMMITTING...</> : <><Upload className="h-3 w-3 mr-2" />COMMIT VERSION</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Community Rule Preview Dialog */}
      <Dialog open={!!communityOpen} onOpenChange={() => setCommunityOpen(null)}>
        {communityOpen && (
          <DialogContent className="bg-background border-border max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">{communityOpen.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[communityOpen.type] ?? "")}>{communityOpen.type.toUpperCase()}</Badge>
                <Badge variant="outline" className={cn("text-xs", SEV_COLORS[communityOpen.severity] ?? "")}>{communityOpen.severity.toUpperCase()}</Badge>
                <span className="text-xs font-mono text-primary border border-primary/40 px-2 py-0.5">{communityOpen.mitreTechnique}</span>
                <span className={cn("text-xs font-mono border px-2 py-0.5", SOURCE_COLORS[communityOpen.source] ?? "text-muted-foreground border-border")}>
                  {communityOpen.source}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{communityOpen.description}</p>
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>By {communityOpen.author} · {communityOpen.mitreTactic}</span>
                <span>v{communityOpen.version}</span>
              </div>
              <div>
                <div className="text-xs font-mono text-muted-foreground mb-1">RULE CONTENT</div>
                <pre className="bg-muted/30 border border-border p-3 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre max-h-64 overflow-y-auto">{communityOpen.ruleContent}</pre>
              </div>
              <Button onClick={() => importCommunityRule(communityOpen)} disabled={importing}
                className="w-full font-mono text-xs bg-primary text-primary-foreground">
                {importing ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" />IMPORTING...</> : <><Plus className="h-3 w-3 mr-2" />IMPORT TO DRAFT</>}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Update Check Dialog */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        {updateInfo && (
          <DialogContent className="bg-background border-border max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">COMMUNITY RULE UPDATES</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Last checked: {timeAgo(updateInfo.lastChecked)}</span>
                <Badge variant="outline" className={cn("text-xs", updateInfo.available > 0 ? "text-emerald-400 border-emerald-500/40" : "text-muted-foreground")}>
                  {updateInfo.available} NEW RULES
                </Badge>
              </div>

              {/* Sources */}
              <div>
                <div className="text-xs font-mono text-muted-foreground mb-2">SOURCES</div>
                <div className="space-y-1.5">
                  {Object.entries(updateInfo.sources).map(([name, src]) => (
                    <div key={name} className="flex items-center justify-between border border-border p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-mono font-bold", SOURCE_COLORS[name] ?? "text-muted-foreground")}>{name}</span>
                        <a href={src.url} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary" onClick={e => e.stopPropagation()}>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <span className={cn("font-mono", src.newRules > 0 ? "text-emerald-400" : "text-muted-foreground")}>
                        {src.newRules > 0 ? `+${src.newRules} new` : "Up to date"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available rules */}
              {updateInfo.updates.length > 0 && (
                <div>
                  <div className="text-xs font-mono text-muted-foreground mb-2">AVAILABLE RULES</div>
                  <div className="space-y-1.5">
                    {updateInfo.updates.map((u, i) => (
                      <div key={i} className="border border-border p-2.5 flex items-start gap-3">
                        <Badge variant="outline" className={cn("text-xs shrink-0 mt-0.5", TYPE_COLORS[u.type] ?? "")}>{u.type.toUpperCase()}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium">{u.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs font-mono text-muted-foreground">
                            <span className={SOURCE_COLORS[u.source] ?? "text-muted-foreground"}>{u.source}</span>
                            <span className="text-primary">{u.mitreTechnique}</span>
                            <span>Published {u.publishedAt}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">New rules are available in the Community Library after the next sync. Sources: SigmaHQ, YARA-Forge, signature-base, JPCERT/CC.</p>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
