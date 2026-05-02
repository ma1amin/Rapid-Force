import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  active: number;
  pending: number;
  complete: number;
  failed: number;
}

const COLORS: Record<string, string> = {
  ACTIVE: "hsl(168 100% 50%)",
  PENDING: "hsl(210 20% 60%)",
  COMPLETE: "hsl(168 100% 35%)",
  FAILED: "hsl(0 100% 60%)",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border px-3 py-2 text-xs font-mono">
        <span style={{ color: payload[0].fill }}>{payload[0].payload.name}: </span>
        <span className="text-foreground">{payload[0].value}</span>
      </div>
    );
  }
  return null;
};

export default function MissionStatusChart({ active, pending, complete, failed }: Props) {
  const data = [
    { name: "ACTIVE", count: active },
    { name: "PENDING", count: pending },
    { name: "COMPLETE", count: complete },
    { name: "FAILED", count: failed },
  ];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barCategoryGap="30%">
        <XAxis
          dataKey="name"
          tick={{ fill: "hsl(210 20% 60%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "hsl(210 20% 60%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          width={20}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(210 40% 17% / 0.5)" }} />
        <Bar dataKey="count" radius={0}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
