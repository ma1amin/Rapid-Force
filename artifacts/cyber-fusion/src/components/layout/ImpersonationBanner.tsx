import { useState, useEffect } from "react";
import { EyeOff, LogOut, AlertTriangle, Loader2, Clock } from "lucide-react";
import type { AuthUser } from "@/hooks/useAuth";

interface Props {
  user: AuthUser;
  onExit: () => Promise<void>;
}

export default function ImpersonationBanner({ user, onExit }: Props) {
  const [exiting, setExiting] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!user.impersonationExpiresAt) return;
    const update = () => {
      const ms = user.impersonationExpiresAt! - Date.now();
      setMinutesLeft(Math.max(0, Math.ceil(ms / 60000)));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [user.impersonationExpiresAt]);

  const handleExit = async () => {
    setExiting(true);
    await onExit();
  };

  return (
    <div className="flex items-center gap-3 bg-orange-500/15 border-b border-orange-500/40 px-5 py-2 shrink-0 z-50">
      <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse shrink-0" />

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <EyeOff className="h-3.5 w-3.5 text-orange-400 shrink-0" />
        <span className="text-xs font-mono text-orange-200 truncate">
          IMPERSONATING:{" "}
          <span className="text-orange-300 font-bold">{user.tenantName}</span>
          {" "}·{" "}
          <span className="text-orange-300">{user.displayName}</span>
          {" "}·{" "}
          <span className="text-orange-400/80">{user.role.toUpperCase()}</span>
          {user.impersonatorEmail && (
            <span className="text-orange-500/70"> · ADMIN: {user.impersonatorEmail}</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-orange-400/70 border border-orange-500/20 px-2 py-1">
          <AlertTriangle className="h-3 w-3" />
          SENSITIVE DATA MASKED
        </div>

        {minutesLeft !== null && (
          <div className="flex items-center gap-1 text-xs font-mono text-orange-400/60 border border-orange-500/20 px-2 py-1">
            <Clock className="h-3 w-3" />
            {minutesLeft}m left
          </div>
        )}

        <button
          onClick={handleExit}
          disabled={exiting}
          className="flex items-center gap-1.5 text-xs font-mono border border-orange-400/50 text-orange-300 bg-orange-500/10 px-3 py-1.5 hover:bg-orange-500/25 transition-colors disabled:opacity-50"
        >
          {exiting
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <LogOut className="h-3 w-3" />
          }
          EXIT
        </button>
      </div>
    </div>
  );
}
