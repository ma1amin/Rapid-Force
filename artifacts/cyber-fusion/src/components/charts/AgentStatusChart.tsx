import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  active: number;
  idle: number;
  standby: number;
  offline: number;
}

const COLORS = [
  "hsl(168 100% 50%)",
  "hsl(210 20% 60%)",
  "hsl(36 100% 50%)",
  "hsl(0 100% 60%)",
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border px-3 py-2 text-xs font-mono">
        <span style={{ color: payload[0].payload.fill }}>{payload[0].name}: </span>
        <span className="text-foreground">{payload[0].value}</span>
      </div>
    );
  }
  return null;
};

export default function AgentStatusChart({ active, idle, standby, offline }: Props) {
  const data = [
    { name: "ACTIVE", value: active },
    { name: "IDLE", value: idle },
    { name: "STANDBY", value: standby },
    { name: "OFFLINE", value: offline },
  ].filter((d) => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={2}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-xs font-mono text-muted-foreground">{value}</span>
          )}
          iconType="square"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
