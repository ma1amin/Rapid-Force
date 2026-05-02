import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Building2, Users, LogOut, ShieldCheck,
  ChevronDown, ScrollText, Tag, Megaphone, BarChart3, Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useState, type ReactNode } from "react";
import Footer from "@/components/layout/Footer";

const nav = [
  { name: "Dashboard",      href: "/admin",                    icon: LayoutDashboard },
  { name: "Tenants",        href: "/admin/tenants",            icon: Building2 },
  { name: "Users",          href: "/admin/users",              icon: Users },
  { name: "Analytics",      href: "/admin/analytics",          icon: BarChart3 },
  { name: "Vouchers",       href: "/admin/vouchers",           icon: Tag },
  { name: "Announcements",  href: "/admin/announcements",      icon: Megaphone },
  { name: "License Admin",  href: "/admin/license-admin",      icon: Key },
  { name: "Audit Log",      href: "/admin/audit",              icon: ScrollText },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { admin, logout } = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="flex h-full w-60 flex-col border-r border-border bg-sidebar shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center bg-orange-500/20 border border-orange-500/40 shrink-0">
            <ShieldCheck className="h-5 w-5 text-orange-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wider text-foreground leading-none">RAPID FORCE</span>
            <span className="text-xs font-mono text-orange-400 leading-none mt-1">ADMIN PORTAL</span>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 border border-orange-500/30 bg-orange-500/5 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />
            <span className="text-xs font-mono text-orange-300 truncate">PLATFORM OWNER</span>
          </div>
        </div>

        <div className="px-4 pt-4 pb-2 text-[10px] font-mono text-muted-foreground tracking-widest">PLATFORM CONTROL</div>

        <nav className="flex-1 space-y-0.5 px-3 overflow-y-auto">
          {nav.map((item) => {
            const isActive = item.href === "/admin" ? location === "/admin" : location.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href}
                className={cn("group flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors border-l-2",
                  isActive
                    ? "bg-orange-500/10 text-orange-300 border-orange-400"
                    : "text-sidebar-foreground hover:bg-orange-500/5 hover:text-orange-200 border-transparent"
                )}>
                <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-orange-400" : "text-muted-foreground group-hover:text-orange-300")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin user */}
        <div className="border-t border-border">
          <button onClick={() => setMenuOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sidebar-accent/40 transition-colors">
            <div className="flex h-7 w-7 items-center justify-center bg-orange-500/20 border border-orange-500/30 shrink-0 text-xs font-bold text-orange-300">
              {admin?.email?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-medium truncate">{admin?.email ?? "Platform Admin"}</div>
              <div className="text-xs font-mono text-orange-400/70">SUPERADMIN</div>
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", menuOpen ? "rotate-180" : "")} />
          </button>
          {menuOpen && (
            <div className="border-t border-border bg-sidebar">
              <button onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-mono text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="h-3.5 w-3.5" />SIGN OUT
              </button>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs font-mono">
            <span className="text-muted-foreground">SYS_STATUS</span>
            <span className="text-orange-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />ONLINE
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col min-h-full">
          <div className="flex-1 p-6">{children}</div>
          <Footer />
        </div>
      </main>
    </div>
  );
}
