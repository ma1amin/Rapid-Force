import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import CopilotPanel from "./CopilotPanel";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CopilotModal({ isOpen, onClose }: Props) {
  const [minimized, setMinimized] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !minimized) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, minimized, onClose]);

  useEffect(() => { if (!isOpen) setMinimized(false); }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed z-50 right-6 w-[500px] bg-card border border-primary/20 flex flex-col",
        "shadow-[0_0_0_1px_hsl(var(--primary)/0.1),0_12px_80px_rgba(0,0,0,0.55),0_0_40px_hsl(var(--primary)/0.08)]",
        "transition-[height] duration-200 ease-in-out",
        minimized ? "bottom-24 h-10 rounded-none" : "bottom-24 h-[660px] max-h-[calc(100vh-112px)]"
      )}
    >
      {/* macOS-style window chrome */}
      <div className="flex items-center gap-0 px-3 py-2.5 border-b border-border bg-sidebar/90 shrink-0 select-none cursor-default">
        <div className="flex items-center gap-1.5 mr-3">
          {/* Red — close */}
          <button
            onClick={onClose}
            className="group relative w-3 h-3 rounded-full bg-red-500/75 hover:bg-red-500 transition-colors"
            title="Close"
          >
            <span className="absolute inset-0 flex items-center justify-center text-red-900 font-bold text-[7px] opacity-0 group-hover:opacity-100 leading-none">✕</span>
          </button>
          {/* Yellow — minimize */}
          <button
            onClick={() => setMinimized(v => !v)}
            className="group relative w-3 h-3 rounded-full bg-yellow-500/75 hover:bg-yellow-500 transition-colors"
            title={minimized ? "Restore" : "Minimize"}
          >
            <span className="absolute inset-0 flex items-center justify-center text-yellow-900 font-bold text-[7px] opacity-0 group-hover:opacity-100 leading-none">—</span>
          </button>
          {/* Green — expand to full page */}
          <button
            onClick={() => { onClose(); navigate("/copilot"); }}
            className="group relative w-3 h-3 rounded-full bg-emerald-500/75 hover:bg-emerald-500 transition-colors"
            title="Open full page"
          >
            <span className="absolute inset-0 flex items-center justify-center text-emerald-900 font-bold text-[7px] opacity-0 group-hover:opacity-100 leading-none">⤢</span>
          </button>
        </div>

        <span className="text-[10px] font-mono text-muted-foreground tracking-wider">
          RAPID FORCE AI COPILOT
        </span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground/40">ESC</span>
      </div>

      {!minimized && (
        <div className="flex-1 overflow-hidden">
          <CopilotPanel variant="modal" />
        </div>
      )}
    </div>
  );
}
