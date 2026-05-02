import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Announcement { id: number; title: string; body: string; type: string }

const TYPE_CONFIG: Record<string, { icon: typeof Info; bg: string; border: string; text: string; dot: string }> = {
  info:     { icon: Info,         bg: "bg-primary/10",       border: "border-primary/30",     text: "text-primary",    dot: "bg-primary" },
  warning:  { icon: AlertTriangle, bg: "bg-yellow-400/10",  border: "border-yellow-400/30",  text: "text-yellow-400", dot: "bg-yellow-400" },
  critical: { icon: AlertOctagon,  bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", dot: "bg-destructive" },
};

const STORAGE_KEY = "rf_dismissed_announcements";
const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

function getDismissed(): number[] {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function dismiss(id: number) {
  const current = getDismissed();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...current, id]));
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set(getDismissed()));

  useEffect(() => {
    fetch(`${API}/announcements/active`, { credentials: "include" })
      .then((r) => r.json())
      .then(setAnnouncements)
      .catch(() => {});
  }, []);

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const handleDismiss = (id: number) => {
    dismiss(id);
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <div className="shrink-0">
      {visible.map((a) => {
        const cfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.info;
        return (
          <div key={a.id} className={cn("flex items-start gap-3 border-b px-5 py-2.5", cfg.bg, cfg.border.replace("border-", "border-b-"))}>
            <span className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 animate-pulse", cfg.dot)} />
            <cfg.icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", cfg.text)} />
            <div className="flex-1 min-w-0">
              <span className={cn("text-xs font-mono font-bold mr-2", cfg.text)}>{a.title}</span>
              <span className="text-xs font-mono text-muted-foreground">{a.body}</span>
            </div>
            <button onClick={() => handleDismiss(a.id)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
