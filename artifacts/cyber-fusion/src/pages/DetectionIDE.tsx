import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Code2, GitBranch, ArrowRight, ChevronRight, RefreshCcw, Loader2, Clock, CheckCircle, AlertTriangle, Package, Plus, Play, Upload, BookOpen, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const TABS = ["Pipeline", "Community Library"] as const;

export default function DetectionIDE() {
  const { toast } = useToast();
  const [board, setBoard]         = useState<Record<string, Detection[]>>({ draft: [], review: [], test: [], production: [] });
  const [community, setCommunity] = useState<CommunityRule[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<typeof TABS[number]>("Pipeline");
  const [selected, setSelected]   = useState<Detection | null>(null);
  const [versions, setVersions]   = useState<RuleVersion[]>([]);
  const [advancing, setAdvancing] = useState<number | null>(null);
  const [versionOpen, setVersionOpen] = useState(false);
  const [commitOpen, setCommitOpen]   = useState(false);
  const [communityOpen, setCommunityOpen] = useState<CommunityRule | null>(null);
  const [editedRule, setEditedRule] = useState("");
  const [changelog, setChangelog]   = useState("");
  const [committing, setCommitting] = useState(false);
  const [importing, setImporting]   = useState(false);

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
      if (selected?.id === id) {
        const allDetections = Object.values(board).flat();
        const updated = allDetections.find(d => d.id === id);
        if (updated) setSelected(updated);
      }
      toast({ title: "Rule advanced in pipeline" });
    } catch { toast({ title: "Failed to advance", variant: "destructive" }); }
    finally { setAdvancing(null); }
  };

  const loadVersions = async (id: number) => {
    try {
      const res = await fetch(`${BASE}/api/rule-pipeline/${id}/versions`, { credentials: "include" });
      setVersions(await res.json());
    } catch { setVersions([]); }
  };

  const selectDetection = async (d: Detection) => {
    setSelected(d);
    setEditedRule(d.ruleContent);
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
        body: JSON.stringify({ name: rule.name, description: rule.description, type: rule.type, severity: rule.severity, ruleContent: rule.ruleContent, mitreTechnique: rule.mitreTechnique, mitreTactic: rule.mitreTactic, tags: rule.tags, author: rule.author, status: "disabled" }),
      });
      if (!res.ok) throw new Error();
      await loadBoard();
      setCommunityOpen(null);
      toast({ title: "Rule imported", description: "Added to Draft pipeline." });
    } catch { toast({ title: "Import failed", variant: "destructive" }); }
    finally { setImporting(false); }
  };

  const stageOf = (d: Detection) => d.status === "active" ? "production" : d.status === "testing" ? "test" : d.status === "review" ? "review" : "draft";
  const nextStageLabel = (d: Detection) => ({ draft: "→ REVIEW", review: "→ TEST", testing: "→ PRODUCTION", active: "DEPLOYED" }[d.status] ?? "→ NEXT");

  const totalRules = Object.values(board).flat().length;

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
                    <div key={col.key} className={cn("flex flex-col w-64 shrink-0 border-r border-border last:border-r-0")}>
                      <div className={cn("flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted/10")}>
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
                            {col.key === "draft" ? "No draft rules" : `No rules in ${col.label}`}
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
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/10 shrink-0">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-mono text-primary">RULE EDITOR</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-6 text-xs font-mono"
                    onClick={() => { setVersionOpen(true); loadVersions(selected.id); }}>
                    <GitBranch className="h-3 w-3 mr-1" />HISTORY
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-xs font-mono"
                    onClick={() => setCommitOpen(true)}>
                    <Upload className="h-3 w-3 mr-1" />COMMIT
                  </Button>
                  <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

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

              <div className="flex-1 overflow-hidden">
                <Suspense fallback={<div className="flex items-center justify-center h-32 text-muted-foreground text-xs"><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading editor...</div>}>
                  <RuleEditor
                    type={selected.type}
                    value={editedRule}
                    onChange={setEditedRule}
                  />
                </Suspense>
              </div>

              {selected.status !== "active" && (
                <div className="p-3 border-t border-border shrink-0">
                  <Button size="sm" className="w-full font-mono text-xs bg-primary text-primary-foreground"
                    onClick={() => advance(selected.id)} disabled={advancing === selected.id}>
                    {advancing === selected.id ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <ArrowRight className="h-3 w-3 mr-2" />}
                    {nextStageLabel(selected)}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Community Library */
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <p className="text-xs text-muted-foreground font-mono">Community-contributed detection rules — click to preview and import into your pipeline.</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-24"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {community.map((rule, i) => (
                <div key={i}
                  onClick={() => setCommunityOpen(rule)}
                  className="border border-border bg-card p-4 cursor-pointer hover:border-primary/50 transition-all">
                  <div className="flex flex-wrap gap-1 mb-2">
                    <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[rule.type] ?? "")}>{rule.type.toUpperCase()}</Badge>
                    <Badge variant="outline" className={cn("text-xs", SEV_COLORS[rule.severity] ?? "")}>{rule.severity.toUpperCase()}</Badge>
                  </div>
                  <div className="font-medium text-sm mb-1">{rule.name}</div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{rule.description}</p>
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span className="text-primary">{rule.mitreTechnique}</span>
                    <span>{rule.author}</span>
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
      )}

      {/* Version History Dialog */}
      <Dialog open={versionOpen} onOpenChange={setVersionOpen}>
        <DialogContent className="bg-background border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">VERSION HISTORY — {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {versions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No version history yet.</p>
            ) : versions.map(v => (
              <div key={v.id} className={cn("border p-3", v.isCurrent ? "border-primary/40 bg-primary/5" : "border-border")}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-mono font-bold">v{v.version}</span>
                  <div className="flex items-center gap-2">
                    {v.isCurrent && <Badge variant="outline" className="text-xs text-primary border-primary/40">CURRENT</Badge>}
                    <Badge variant="outline" className="text-xs text-muted-foreground">{v.stage.toUpperCase()}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{v.changelog}</p>
                <div className="text-xs font-mono text-muted-foreground">{v.author} · {timeAgo(v.createdAt)}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Commit Dialog */}
      <Dialog open={commitOpen} onOpenChange={setCommitOpen}>
        <DialogContent className="bg-background border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">COMMIT NEW VERSION</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1">CHANGELOG</label>
              <Textarea value={changelog} onChange={e => setChangelog(e.target.value)}
                placeholder="Describe what changed in this version..." className="font-mono text-xs min-h-16 resize-none" />
            </div>
            <p className="text-xs text-muted-foreground">Committing a new version will reset the rule to Draft stage for re-review.</p>
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
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[communityOpen.type] ?? "")}>{communityOpen.type.toUpperCase()}</Badge>
                <Badge variant="outline" className={cn("text-xs", SEV_COLORS[communityOpen.severity] ?? "")}>{communityOpen.severity.toUpperCase()}</Badge>
                <span className="text-xs font-mono text-primary border border-primary/40 px-2 py-0.5">{communityOpen.mitreTechnique}</span>
              </div>
              <p className="text-xs text-muted-foreground">{communityOpen.description}</p>
              <div className="text-xs font-mono text-muted-foreground">By {communityOpen.author} · {communityOpen.mitreTactic}</div>
              <div>
                <div className="text-xs font-mono text-muted-foreground mb-1">RULE CONTENT</div>
                <pre className="bg-muted/30 border border-border p-3 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre">{communityOpen.ruleContent}</pre>
              </div>
              <Button onClick={() => importCommunityRule(communityOpen)} disabled={importing}
                className="w-full font-mono text-xs bg-primary text-primary-foreground">
                {importing ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" />IMPORTING...</> : <><Plus className="h-3 w-3 mr-2" />IMPORT TO PIPELINE</>}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
