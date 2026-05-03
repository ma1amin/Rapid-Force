import CopilotPanel from "@/components/copilot/CopilotPanel";

export default function AICopilot() {
  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col -mx-2">
      <div className="mb-4 px-2">
        <div className="text-xs font-mono text-primary/70 tracking-widest mb-1">RAPID FORCE // AI ANALYST</div>
        <h1 className="text-2xl font-bold tracking-wider">AI COPILOT</h1>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">Autonomous cybersecurity analyst · Live platform context</p>
      </div>
      <div className="flex-1 border border-border overflow-hidden">
        <CopilotPanel variant="page" />
      </div>
    </div>
  );
}
