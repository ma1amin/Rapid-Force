import { useState } from "react";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import GlobalSearch from "@/components/search/GlobalSearch";
import CopilotPanel from "@/components/copilot/CopilotPanel";
import { Search, Sun, Moon, Bot, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useEffect } from "react";
import { useListThreats } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const { data: threats } = useListThreats();
  const activeThreats = threats?.filter((t) => t.status === "active").length ?? 0;
  const criticalThreats = threats?.filter((t) => t.severity === "critical" && t.status === "active").length ?? 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setCopilotOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar onCopilotOpen={() => setCopilotOpen((v) => !v)} copilotOpen={copilotOpen} />

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

            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="flex items-center justify-center h-7 w-7 border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-primary">LIVE</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto relative">
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative z-10 flex flex-col min-h-full">
              <div className="flex-1 p-8">{children}</div>
              <Footer />
            </div>
          </main>

          {/* Copilot panel — slides in on the right */}
          <div
            className={cn(
              "border-l border-border bg-card flex-shrink-0 overflow-hidden transition-all duration-300",
              copilotOpen ? "w-[420px]" : "w-0"
            )}
          >
            {copilotOpen && <CopilotPanel onClose={() => setCopilotOpen(false)} />}
          </div>
        </div>
      </div>

      {/* Floating AI Copilot button */}
      {!copilotOpen && (
        <button
          onClick={() => setCopilotOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 font-mono text-xs font-bold tracking-wider transition-all duration-200 shadow-lg",
            "bg-primary text-primary-foreground hover:opacity-90",
            criticalThreats > 0 && "animate-pulse"
          )}
          title="Open AI Copilot (⌘/)"
        >
          <Bot className="h-4 w-4 shrink-0" />
          AI COPILOT
          {activeThreats > 0 && (
            <span className="flex h-4 w-4 items-center justify-center bg-destructive text-destructive-foreground text-[10px] rounded-full">
              {activeThreats > 9 ? "9+" : activeThreats}
            </span>
          )}
        </button>
      )}

      {/* Close floating button when panel is open */}
      {copilotOpen && (
        <button
          onClick={() => setCopilotOpen(false)}
          className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors shadow-lg"
          title="Close Copilot"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
