import { useState, useEffect, useCallback } from "react";
import { Plug, Download, Trash2, ToggleLeft, ToggleRight, Search, Star, Users, Shield, Bell, Ticket, Database, Cloud, Key, AlertTriangle, GitBranch, Monitor, RefreshCcw, Loader2, CheckCircle, Package, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ConfigField {
  key: string; label: string; type: "text" | "password" | "url" | "email" | "select";
  placeholder: string; required: boolean; options?: string[];
}
interface ConfigSchema { fields: ConfigField[]; }

interface Plugin {
  id: number; name: string; slug: string; description: string; longDesc: string;
  author: string; version: string; category: string; icon: string;
  capabilities: string[]; configSchema: ConfigSchema; isBuiltIn: boolean;
  isInstalled: boolean; isEnabled: boolean; installCount: number; rating: number; reviewCount: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  slack: Bell, bell: Bell, ticket: Ticket, layers: Package, search: Search,
  shield: Shield, database: Database, cloud: Cloud, monitor: Monitor,
  key: Key, "alert-triangle": AlertTriangle, "git-branch": GitBranch, plug: Plug,
};

const CATEGORY_LABELS: Record<string, string> = {
  siem: "SIEM", ticketing: "Ticketing", notification: "Notification",
  threat_intel: "Threat Intel", ir_tools: "IR Tools", cloud_security: "Cloud Security",
  identity: "Identity", vulnerability: "Vulnerability",
};

const CATEGORY_COLORS: Record<string, string> = {
  siem: "text-blue-400 border-blue-500/40 bg-blue-500/10",
  ticketing: "text-purple-400 border-purple-500/40 bg-purple-500/10",
  notification: "text-green-400 border-green-500/40 bg-green-500/10",
  threat_intel: "text-red-400 border-red-500/40 bg-red-500/10",
  ir_tools: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  cloud_security: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
  identity: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
  vulnerability: "text-pink-400 border-pink-500/40 bg-pink-500/10",
};

const CATEGORIES = ["All", "siem", "ticketing", "notification", "threat_intel", "ir_tools", "cloud_security", "identity", "vulnerability"];
const TABS = ["All Plugins", "Installed", "Built-In"] as const;

export default function PluginMarketplace() {
  const { toast } = useToast();
  const [plugins, setPlugins]         = useState<Plugin[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [category, setCategory]       = useState("All");
  const [tab, setTab]                 = useState<typeof TABS[number]>("All Plugins");
  const [selected, setSelected]       = useState<Plugin | null>(null);
  const [acting, setActing]           = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [saving, setSaving]           = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [configSaved, setConfigSaved] = useState<string | null>(null);

  const fetchPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/plugins`, { credentials: "include" });
      const data = await res.json();
      setPlugins(Array.isArray(data) ? data : []);
    } catch { toast({ title: "Failed to load plugins", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPlugins(); }, [fetchPlugins]);

  const selectPlugin = (plugin: Plugin) => {
    setSelected(plugin);
    setConfigValues(Object.fromEntries((plugin.configSchema?.fields ?? []).map(field => [field.key, ""])) as Record<string, string>);
    setConfigSaved(null);
    setShowPasswords({});
  };

  const install = async (slug: string) => {
    setActing(slug);
    try {
      const res = await fetch(`${BASE}/api/plugins/${slug}/install`, { method: "POST", credentials: "include" });
      const updated: Plugin = await res.json();
      setPlugins(ps => ps.map(p => p.slug === slug ? { ...p, ...updated } : p));
      if (selected?.slug === slug) setSelected(s => s ? { ...s, ...updated } : s);
      toast({ title: `${updated.name} installed`, description: "Plugin is now active." });
    } catch { toast({ title: "Install failed", variant: "destructive" }); }
    finally { setActing(null); }
  };

  const uninstall = async (slug: string, name: string) => {
    setActing(slug);
    try {
      await fetch(`${BASE}/api/plugins/${slug}/uninstall`, { method: "POST", credentials: "include" });
      setPlugins(ps => ps.map(p => p.slug === slug ? { ...p, isInstalled: false, isEnabled: false } : p));
      if (selected?.slug === slug) setSelected(s => s ? { ...s, isInstalled: false, isEnabled: false } : s);
      toast({ title: `${name} uninstalled` });
    } catch { toast({ title: "Uninstall failed", variant: "destructive" }); }
    finally { setActing(null); }
  };

  const toggle = async (slug: string, enabled: boolean) => {
    setActing(slug + "-toggle");
    try {
      await fetch(`${BASE}/api/plugins/${slug}/toggle`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
      setPlugins(ps => ps.map(p => p.slug === slug ? { ...p, isEnabled: enabled } : p));
      if (selected?.slug === slug) setSelected(s => s ? { ...s, isEnabled: enabled } : s);
    } catch { toast({ title: "Toggle failed", variant: "destructive" }); }
    finally { setActing(null); }
  };

  const saveConfig = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(`${BASE}/api/plugins/${selected.slug}/config`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: configValues }),
      });
      setConfigSaved(selected.slug);
      toast({ title: "Configuration saved", description: `${selected.name} settings updated.` });
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const filtered = plugins.filter(p => {
    if (tab === "Installed" && !p.isInstalled) return false;
    if (tab === "Built-In" && !p.isBuiltIn) return false;
    if (category !== "All" && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const installedCount = plugins.filter(p => p.isInstalled).length;
  const configFields: ConfigField[] = selected?.configSchema?.fields ?? [];
  const hasRequiredFields = configFields.some(f => f.required);
  const allRequiredFilled = configFields.filter(f => f.required).every(f => configValues[f.key]?.trim());

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold tracking-wider">PLUGIN MARKETPLACE</h1>
              <Badge variant="outline" className="text-xs font-mono text-primary border-primary/40 bg-primary/5 ml-2">{plugins.length} AVAILABLE</Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-1">Extend Rapid Force with third-party integrations and connectors</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-mono text-muted-foreground">INSTALLED</div>
              <div className="text-xl font-bold text-primary font-mono">{installedCount}</div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPlugins} className="font-mono text-xs">
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />REFRESH
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-3">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-3 py-1 text-xs font-mono border transition-colors",
                tab === t ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50")}>
              {t.toUpperCase()}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plugins..." className="pl-7 h-7 text-xs font-mono w-52" />
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={cn("px-2 py-0.5 text-xs font-mono border transition-colors",
                category === cat ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>
              {cat === "All" ? "ALL" : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Plugin Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading plugins...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-16">No plugins match your filters.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(plugin => {
                const IconComp = ICON_MAP[plugin.icon] ?? Plug;
                const isActing = acting === plugin.slug;
                return (
                  <div key={plugin.id}
                    onClick={() => selectPlugin(plugin)}
                    className={cn("border bg-card p-4 cursor-pointer hover:border-primary/50 transition-all group",
                      selected?.slug === plugin.slug ? "border-primary bg-primary/5" : "border-border",
                      plugin.isInstalled && "border-l-2 border-l-primary")}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center border",
                        plugin.isInstalled ? "border-primary/40 bg-primary/10" : "border-border bg-muted/30")}>
                        <IconComp className={cn("h-5 w-5", plugin.isInstalled ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold truncate">{plugin.name}</span>
                          {plugin.isBuiltIn && <Badge variant="outline" className="text-xs text-primary border-primary/40 bg-primary/5 shrink-0">BUILT-IN</Badge>}
                          {plugin.isInstalled && <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">v{plugin.version} · {plugin.author}</div>
                      </div>
                    </div>

                    <Badge variant="outline" className={cn("text-xs mb-2", CATEGORY_COLORS[plugin.category])}>
                      {CATEGORY_LABELS[plugin.category]}
                    </Badge>

                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{plugin.description}</p>

                    <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-400" />{(plugin.rating / 10).toFixed(1)}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{plugin.installCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {plugin.isInstalled ? (
                          <>
                            <button onClick={e => { e.stopPropagation(); toggle(plugin.slug, !plugin.isEnabled); }}
                              className="p-1 hover:text-primary transition-colors" title={plugin.isEnabled ? "Disable" : "Enable"}>
                              {acting === plugin.slug + "-toggle" ? <Loader2 className="h-4 w-4 animate-spin" /> : plugin.isEnabled ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
                            </button>
                            <button onClick={e => { e.stopPropagation(); uninstall(plugin.slug, plugin.name); }}
                              className="p-1 hover:text-destructive transition-colors">
                              {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          </>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); install(plugin.slug); }}
                            className="flex items-center gap-1 px-2 py-0.5 border border-primary/40 text-primary hover:bg-primary/10 transition-colors text-xs">
                            {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                            INSTALL
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (() => {
          const IconComp = ICON_MAP[selected.icon] ?? Plug;
          const isActing = acting === selected.slug;
          const configFields: ConfigField[] = selected.configSchema?.fields ?? [];
          return (
            <div className="w-[420px] border-l border-border flex flex-col shrink-0 overflow-y-auto bg-background">
              {/* Header */}
              <div className="p-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center border",
                    selected.isInstalled ? "border-primary/40 bg-primary/10" : "border-border bg-muted/30")}>
                    <IconComp className={cn("h-6 w-6", selected.isInstalled ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <div className="font-bold">{selected.name}</div>
                    <div className="text-xs font-mono text-muted-foreground">{selected.author}</div>
                    <div className="text-xs font-mono text-muted-foreground">v{selected.version}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={cn("text-xs", CATEGORY_COLORS[selected.category])}>
                    {CATEGORY_LABELS[selected.category]}
                  </Badge>
                  {selected.isBuiltIn && <Badge variant="outline" className="text-xs text-primary border-primary/40">BUILT-IN</Badge>}
                  {selected.isInstalled && <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/40">INSTALLED</Badge>}
                </div>

                <div className="flex gap-2">
                  {selected.isInstalled ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => toggle(selected.slug, !selected.isEnabled)}
                        className={cn("flex-1 font-mono text-xs", selected.isEnabled ? "border-primary/40 text-primary" : "")}>
                        {acting === selected.slug + "-toggle" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : selected.isEnabled ? <ToggleRight className="h-3 w-3 mr-1" /> : <ToggleLeft className="h-3 w-3 mr-1" />}
                        {selected.isEnabled ? "ENABLED" : "DISABLED"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => uninstall(selected.slug, selected.name)}
                        className="font-mono text-xs text-destructive border-destructive/40 hover:bg-destructive/10">
                        {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => install(selected.slug)} disabled={isActing}
                      className="flex-1 font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                      {isActing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                      INSTALL PLUGIN
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-5 flex-1">
                {/* About */}
                <div>
                  <div className="text-xs font-mono text-muted-foreground mb-1">ABOUT</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{selected.longDesc || selected.description}</p>
                </div>

                {/* Capabilities */}
                <div>
                  <div className="text-xs font-mono text-muted-foreground mb-2">CAPABILITIES</div>
                  <div className="space-y-1">
                    {selected.capabilities.map((cap, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="h-1 w-1 rounded-full bg-primary shrink-0" />
                        {cap}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Configuration */}
                {configFields.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-mono text-muted-foreground">CONFIGURATION</div>
                      {configSaved === selected.slug && (
                        <div className="flex items-center gap-1 text-xs font-mono text-emerald-400">
                          <CheckCircle className="h-3 w-3" />SAVED
                        </div>
                      )}
                    </div>
                    <div className="space-y-3 bg-muted/10 border border-border p-3">
                      {configFields.map(field => (
                        <div key={field.key}>
                          <label className="block text-xs font-mono text-muted-foreground mb-1">
                            {field.label}{field.required && <span className="text-red-400 ml-1">*</span>}
                          </label>
                          {field.type === "select" && field.options ? (
                            <select
                              value={configValues[field.key] ?? ""}
                              onChange={e => setConfigValues(v => ({ ...v, [field.key]: e.target.value }))}
                              className="w-full h-7 text-xs font-mono bg-background border border-border px-2 text-foreground focus:border-primary outline-none">
                              <option value="">Select...</option>
                              {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : (
                            <div className="relative">
                              <Input
                                type={field.type === "password" && !showPasswords[field.key] ? "password" : field.type === "password" ? "text" : field.type}
                                value={configValues[field.key] ?? ""}
                                onChange={e => setConfigValues(v => ({ ...v, [field.key]: e.target.value }))}
                                placeholder={field.placeholder}
                                className="h-7 text-xs font-mono pr-8"
                              />
                              {field.type === "password" && (
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords(p => ({ ...p, [field.key]: !p[field.key] }))}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                  {showPasswords[field.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      <Button size="sm" onClick={saveConfig} disabled={saving || (hasRequiredFields && !allRequiredFilled)}
                        className="w-full font-mono text-xs bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 mt-1">
                        {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                        SAVE CONFIGURATION
                      </Button>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "RATING", value: `${(selected.rating / 10).toFixed(1)} / 5.0` },
                    { label: "REVIEWS", value: selected.reviewCount.toLocaleString() },
                    { label: "INSTALLS", value: selected.installCount.toLocaleString() },
                    { label: "VERSION", value: `v${selected.version}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-muted/30 border border-border p-2 text-center">
                      <div className="text-xs font-mono text-muted-foreground">{label}</div>
                      <div className="text-sm font-bold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
