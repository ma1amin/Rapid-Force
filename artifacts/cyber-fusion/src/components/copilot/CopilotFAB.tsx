import Lottie from "lottie-react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import animationData from "@/assets/copilot-animation.json";
import { playOpenSound } from "@/utils/sounds";

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  activeThreats?: number;
  criticalThreats?: number;
}

export default function CopilotFAB({ isOpen, onToggle, activeThreats = 0, criticalThreats = 0 }: Props) {
  const handleClick = () => {
    if (!isOpen) playOpenSound();
    onToggle();
  };

  return (
    <button
      onClick={handleClick}
      title={isOpen ? "Close AI Copilot" : "Open AI Copilot (⌘/)"}
      className={cn(
        "fixed bottom-6 right-6 z-50 group",
        "flex items-center justify-center",
        "w-16 h-16 rounded-full",
        "transition-all duration-300 ease-out",
        "shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_4px_24px_hsl(var(--primary)/0.2)]",
        "hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.6),0_4px_32px_hsl(var(--primary)/0.35)]",
        "hover:scale-110",
        isOpen
          ? "bg-card border border-primary/40"
          : "bg-[hsl(210_50%_7%)] border border-primary/30 hover:border-primary/60",
        criticalThreats > 0 && !isOpen && "animate-pulse"
      )}
      aria-label={isOpen ? "Close AI Copilot" : "Open AI Copilot"}
    >
      {isOpen ? (
        <div className="flex items-center justify-center w-full h-full">
          <X className="h-5 w-5 text-primary" />
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center">
          <div
            className="w-14 h-14 rounded-full overflow-hidden"
            style={{ filter: "brightness(0) saturate(100%) invert(76%) sepia(97%) saturate(400%) hue-rotate(115deg) brightness(105%)" }}
          >
            <Lottie animationData={animationData} loop autoplay style={{ width: "100%", height: "100%" }} />
          </div>
          {activeThreats > 0 && (
            <span className="absolute inset-0 rounded-full border border-primary/40 animate-ping opacity-30" />
          )}
          {activeThreats > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold font-mono shadow-sm border border-background">
              {activeThreats > 9 ? "9+" : activeThreats}
            </span>
          )}
        </div>
      )}

      {!isOpen && (
        <span className="absolute right-full mr-3 whitespace-nowrap bg-card border border-border px-2.5 py-1 text-xs font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
          AI COPILOT
          <span className="ml-2 text-muted-foreground/60">⌘/</span>
        </span>
      )}
    </button>
  );
}
