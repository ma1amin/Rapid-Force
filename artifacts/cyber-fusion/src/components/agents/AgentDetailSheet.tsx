import { useListMissions } from "@workspace/api-client-react";
import { Cpu, Activity, Clock, Radio, WifiOff, CheckCircle2, XCircle, Target } from "lucide-react";

const statusIcon: Record<string, React.ReactNode> = {
  active: <Activity className="h-3 w-3 text-primary" />,
  idle: <Clock className="h-3 w-3 text-muted-foreground" />,
  standby: <Radio className="h-3 w-3 text-accent" />,
  offline: <WifiOff className="h-3 w-3 text-destructive" />,
};

const missionStatusIcon: Record<string, React.ReactNode> = {
  active: <Activity className="h-3 w-3 text-primary" />,
  pending: <Clock className="h-3 w-3 text-muted-foreground" />,
  complete: <CheckCircle2 className="h-3 w-3 text-primary" />,
  failed: <XCircle className="h-3 w-3 text-destructive" />,
};

const priorityColor: Record<string, string> = {
  critical: "text-destructive",
  high: "text-accent",
  medium: "text-primary",
  low: "text-muted-foreground",
};

const roleLabel: Record<string, string> = {
  architect: "SWARM ARCHITECT",
  cto: "CHIEF TECHNOLOGY OFFICER",
  product_manager: "PRODUCT MANAGER",
  security_lead: "SECURITY LEAD",
  senior_engineer: "SENIOR ENGINEER",
  devops: "DEVOPS ENGINEER",
  ui_ux: "UI/UX DESIGNER",
  red_team: "RED TEAM OPERATOR",
  documentation: "DOCUMENTATION SPECIALIST",
};

interface Agent {
  id: number;
  name: string;
  role: string;
  module: string;
  status: string;
  missionsCompleted: number;
  tasksActive: number;
  lastHeartbeat: string;
  createdAt: string;
}

interface Props {
  agent: Agent | null;
  onClose: () => void;
}

export default function AgentDetailSheet({ agent, onClose }: Props) {
  const { data: allMissions } = useListMissions();
  const agentMissions = allMissions?.filter((m) => m.assignedAgentId === agent?.id) ?? [];

  if (!agent) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-card border-l border-border overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-primary/10 border border-primary/30">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold tracking-wider">{agent.name}</div>
                <div className="text-xs font-mono text-muted-foreground">{roleLabel[agent.role] ?? agent.role.toUpperCase()}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-xs font-mono border border-border px-2 py-1"
            >
              [CLOSE]
            </button>
          </div>

          <div className="flex items-center gap-2">
            {statusIcon[agent.status]}
            <span className="text-xs font-mono text-foreground">{agent.status.toUpperCase()}</span>
            <span className="text-muted-foreground mx-1">·</span>
            <span className="text-xs text-muted-foreground">{agent.module}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold font-mono text-primary">{agent.missionsCompleted}</div>
            <div className="text-xs font-mono text-muted-foreground mt-1">COMPLETED</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold font-mono text-accent">{agent.tasksActive}</div>
            <div className="text-xs font-mono text-muted-foreground mt-1">ACTIVE TASKS</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold font-mono text-foreground">{agentMissions.length}</div>
            <div className="text-xs font-mono text-muted-foreground mt-1">ASSIGNED</div>
          </div>
        </div>

        {/* Metadata */}
        <div className="p-6 border-b border-border space-y-3">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-3">SYSTEM INFO</div>
          {[
            { label: "AGENT ID", value: `#${agent.id}` },
            { label: "MODULE", value: agent.module },
            { label: "LAST HEARTBEAT", value: new Date(agent.lastHeartbeat).toLocaleString() },
            { label: "DEPLOYED", value: new Date(agent.createdAt).toLocaleDateString() },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center text-xs">
              <span className="font-mono text-muted-foreground">{label}</span>
              <span className="font-mono text-foreground">{value}</span>
            </div>
          ))}
        </div>

        {/* Missions */}
        <div className="p-6">
          <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
            <Target className="h-3 w-3" /> MISSION HISTORY ({agentMissions.length})
          </div>
          {agentMissions.length === 0 ? (
            <div className="text-sm font-mono text-muted-foreground">No missions assigned</div>
          ) : (
            <div className="space-y-2">
              {agentMissions.map((m) => (
                <div key={m.id} className="flex items-start gap-3 p-3 bg-background border border-border">
                  <div className="mt-0.5 shrink-0">{missionStatusIcon[m.status]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{m.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-mono ${priorityColor[m.priority]}`}>{m.priority.toUpperCase()}</span>
                      <span className="text-muted-foreground text-xs">·</span>
                      <span className="text-xs font-mono text-muted-foreground">{m.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
