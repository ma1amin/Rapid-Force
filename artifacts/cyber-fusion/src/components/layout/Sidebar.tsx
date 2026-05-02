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
  Crosshair,
  Search,
  Key,
  Lock,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLicenses, type ModuleKey } from "@/hooks/useLicenses";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey: ModuleKey;
}

const navigation: NavItem[] = [
  { name: "Command Center",  href: "/",             icon: TerminalSquare, moduleKey: "command_center"  },
  { name: "Agent Fleet",     href: "/agents",       icon: Cpu,            moduleKey: "agent_fleet"     },
  { name: "Sprint Ops",      href: "/sprints",      icon: Zap,            moduleKey: "sprint_ops"      },
  { name: "Missions",        href: "/missions",     icon: Target,         moduleKey: "missions"        },
  { name: "Threat Intel",    href: "/threats",      icon: ShieldAlert,    moduleKey: "threat_intel"    },
  { name: "Detection Eng.",  href: "/detections",   icon: FileCode2,      moduleKey: "detection_eng"   },
  { name: "Incidents",       href: "/incidents",    icon: Siren,          moduleKey: "incidents"       },
  { name: "Event Log",       href: "/activity",     icon: ActivitySquare, moduleKey: "event_log"       },
  { name: "Adversarial Sim", href: "/adversarial",  icon: Crosshair,      moduleKey: "adversarial_sim" },
  { name: "Threat Hunting",  href: "/hunting",      icon: Search,         moduleKey: "threat_hunting"  },
];

interface Props {
  onCopilotOpen?: () => void;
  copilotOpen?: boolean;
}

export default function Sidebar({ onCopilotOpen, copilotOpen }: Props) {
  const [location] = useLocation();
  const { isEnabled } = useLicenses();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <div className="flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground font-bold shrink-0">
          <TerminalSquare className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-wider text-foreground leading-none">RAPID FORCE</span>
          <span className="text-xs font-mono text-primary leading-none mt-1">CYBER FUSION</span>
        </div>
      </div>

      {/* Tenant badge */}
      {user && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between border border-border px-3 py-1.5 bg-background/30">
            <span className="text-xs font-mono text-muted-foreground truncate">{user.tenantName}</span>
            <span className={cn(
              "text-xs font-mono border px-1.5 py-0.5 shrink-0 ml-2",
              user.tenantTier === "enterprise"   ? "text-destructive border-destructive/40" :
              user.tenantTier === "professional" ? "text-accent border-accent/40" :
              user.tenantTier === "starter"      ? "text-primary border-primary/40" :
              "text-muted-foreground border-border"
            )}>
              {user.tenantTier.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      <div className="px-4 text-xs font-mono text-muted-foreground mb-2 tracking-widest">
        SYSTEM MODULES
      </div>

      <nav className="flex-1 space-y-0.5 px-3 overflow-y-auto">
        {navigation.map((item) => {
          const enabled = isEnabled(item.moduleKey);
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors border-l-2",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border-primary"
                  : enabled
                    ? "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground border-transparent"
                    : "text-muted-foreground/40 border-transparent cursor-pointer hover:bg-sidebar-accent/30"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-primary" : enabled ? "text-muted-foreground group-hover:text-foreground" : "text-muted-foreground/30"
                )}
              />
              <span className="flex-1">{item.name}</span>
              {!enabled && <Lock className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Administration section — admin role only */}
      {user?.role === "admin" && (
        <div className="px-3 py-2 border-t border-border">
          <div className="px-3 text-[10px] font-mono text-muted-foreground tracking-widest mb-1.5">ADMINISTRATION</div>
          <Link
            href="/license-admin"
            className={cn(
              "group flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors border-l-2",
              location === "/license-admin"
                ? "bg-sidebar-accent text-sidebar-accent-foreground border-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground border-transparent"
            )}
          >
            <Key className={cn("h-4 w-4 shrink-0", location === "/license-admin" ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            <span className="flex-1">License Admin</span>
          </Link>
        </div>
      )}

      {/* AI Copilot shortcut */}
      <div className="px-3 py-2 border-t border-border">
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

      {/* User section */}
      <div className="border-t border-border">
        <button
          onClick={() => setUserMenuOpen(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sidebar-accent/40 transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center bg-primary/10 border border-primary/30 shrink-0 text-xs font-bold text-primary">
            {user?.displayName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs font-medium truncate">{user?.displayName ?? "Unknown"}</div>
            <div className="text-xs font-mono text-muted-foreground">{user?.role?.toUpperCase()}</div>
          </div>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", userMenuOpen ? "rotate-180" : "")} />
        </button>

        {userMenuOpen && (
          <div className="border-t border-border bg-sidebar">
            <div className="px-4 py-2 text-xs font-mono text-muted-foreground/60 truncate">{user?.email}</div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-mono text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />SIGN OUT
            </button>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs font-mono">
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
