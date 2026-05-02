import { useState, useEffect, useRef } from "react";
import { useListAgents, useListMissions, useListThreats } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Search, Cpu, Target, ShieldAlert, X } from "lucide-react";

interface Props {
  onClose: () => void;
}

type ResultItem =
  | { kind: "agent"; id: number; name: string; sub: string; href: string }
  | { kind: "mission"; id: number; name: string; sub: string; href: string }
  | { kind: "threat"; id: number; name: string; sub: string; href: string };

const kindIcon: Record<string, React.ReactNode> = {
  agent: <Cpu className="h-3.5 w-3.5 text-primary" />,
  mission: <Target className="h-3.5 w-3.5 text-accent" />,
  threat: <ShieldAlert className="h-3.5 w-3.5 text-destructive" />,
};

const kindLabel: Record<string, string> = {
  agent: "AGENT",
  mission: "MISSION",
  threat: "THREAT",
};

export default function GlobalSearch({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const { data: agents } = useListAgents();
  const { data: missions } = useListMissions();
  const { data: threats } = useListThreats();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setSelected((s) => Math.min(s + 1, results.length - 1));
      if (e.key === "ArrowUp") setSelected((s) => Math.max(s - 1, 0));
      if (e.key === "Enter" && results[selected]) {
        navigate(results[selected].href);
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const q = query.toLowerCase().trim();

  const results: ResultItem[] = q.length < 2 ? [] : [
    ...(agents ?? [])
      .filter((a) => a.name.toLowerCase().includes(q) || a.module.toLowerCase().includes(q) || a.role.toLowerCase().includes(q))
      .slice(0, 4)
      .map((a) => ({ kind: "agent" as const, id: a.id, name: a.name, sub: a.module, href: "/agents" })),
    ...(missions ?? [])
      .filter((m) => m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
      .slice(0, 4)
      .map((m) => ({ kind: "mission" as const, id: m.id, name: m.title, sub: `${m.priority.toUpperCase()} · ${m.category}`, href: "/missions" })),
    ...(threats ?? [])
      .filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      .slice(0, 4)
      .map((t) => ({ kind: "threat" as const, id: t.id, name: t.title, sub: `${t.severity.toUpperCase()} · ${t.category}`, href: "/threats" })),
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-24 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 bg-card border border-primary/50 shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm font-mono outline-none placeholder:text-muted-foreground"
            placeholder="Search agents, missions, threats..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
          />
          <button onClick={onClose} className="shrink-0">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        {/* Results */}
        <div>
          {q.length < 2 ? (
            <div className="px-4 py-6 text-center text-xs font-mono text-muted-foreground">
              TYPE AT LEAST 2 CHARACTERS TO SEARCH
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs font-mono text-muted-foreground">
              NO RESULTS FOUND FOR "{query.toUpperCase()}"
            </div>
          ) : (
            <div className="py-1">
              {results.map((r, i) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    i === selected ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}
                  onClick={() => { navigate(r.href); onClose(); }}
                  onMouseEnter={() => setSelected(i)}
                >
                  <span className="shrink-0">{kindIcon[r.kind]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs font-mono text-muted-foreground">{r.sub}</div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{kindLabel[r.kind]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex gap-4 text-xs font-mono text-muted-foreground">
          <span>↑↓ NAVIGATE</span>
          <span>↵ SELECT</span>
          <span>ESC CLOSE</span>
        </div>
      </div>
    </>
  );
}
