import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import GlobalSearch from "@/components/search/GlobalSearch";
import { Search } from "lucide-react";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <div className="flex items-center justify-between border-b border-border bg-sidebar px-6 py-2 shrink-0">
          <div className="text-xs font-mono text-muted-foreground tracking-widest">
            AI FACTORY // AUTONOMOUS ENGINEERING PLATFORM // v2.0
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Search className="h-3 w-3" />
              SEARCH
              <span className="ml-1 text-muted-foreground/50">⌘K</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-primary">LIVE</span>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto relative">
          {/* Subtle grid pattern overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative z-10 h-full p-8">{children}</div>
        </main>
      </div>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
