import { useState } from "react";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import GlobalSearch from "@/components/search/GlobalSearch";
import CopilotPanel from "@/components/copilot/CopilotPanel";
import CopilotFAB from "@/components/copilot/CopilotFAB";
import { Search, Sun, Moon } from "lucide-react";
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

      {/* Animated floating copilot button */}
      <CopilotFAB
        isOpen={copilotOpen}
        onToggle={() => setCopilotOpen((v) => !v)}
        activeThreats={activeThreats}
        criticalThreats={criticalThreats}
      />

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
