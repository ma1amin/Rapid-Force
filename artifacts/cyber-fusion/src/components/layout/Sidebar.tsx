import { Link, useLocation } from "wouter";
import {
  TerminalSquare,
  Cpu,
  Zap,
  Target,
  ShieldAlert,
  ActivitySquare,
  FileCode2,
  Siren,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Command Center", href: "/", icon: TerminalSquare },
  { name: "Agent Fleet", href: "/agents", icon: Cpu },
  { name: "Sprint Ops", href: "/sprints", icon: Zap },
  { name: "Missions", href: "/missions", icon: Target },
  { name: "Threat Intel", href: "/threats", icon: ShieldAlert },
  { name: "Detection Eng.", href: "/detections", icon: FileCode2 },
  { name: "Incidents", href: "/incidents", icon: Siren },
  { name: "Event Log", href: "/activity", icon: ActivitySquare },
];

interface Props {
  onCopilotOpen?: () => void;
  copilotOpen?: boolean;
}

export default function Sidebar({ onCopilotOpen, copilotOpen }: Props) {
  const [location] = useLocation();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar pt-6">
      <div className="flex items-center gap-3 px-6 mb-10">
        <div className="flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground font-bold">
          <TerminalSquare className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-wider text-foreground leading-none">RAPID FORCE</span>
          <span className="text-xs font-mono text-primary leading-none mt-1">CYBER FUSION</span>
        </div>
      </div>

      <div className="px-4 text-xs font-mono text-muted-foreground mb-4 tracking-widest">
        SYSTEM MODULES
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors border-l-2",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground border-transparent"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* AI Copilot shortcut */}
      <div className="px-3 py-3 border-t border-border">
        <button
          onClick={onCopilotOpen}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors border border-dashed",
            copilotOpen
              ? "border-primary text-primary bg-primary/10"
              : "border-primary/30 text-primary/70 hover:border-primary hover:text-primary hover:bg-primary/5"
          )}
        >
          <Bot className="h-4 w-4 shrink-0" />
          <span>AI Copilot</span>
          <span className="ml-auto text-xs font-mono text-muted-foreground">⌘/</span>
        </button>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-muted-foreground">SYS_STATUS</span>
          <span className="text-primary flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            ONLINE
          </span>
        </div>
      </div>
    </div>
  );
}
