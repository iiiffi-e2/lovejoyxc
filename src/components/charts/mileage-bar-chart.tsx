"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MileagePoint = { label: string; miles: number; highlight?: boolean };

export function MileageBarChart({ data }: { data: MileagePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 600 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(200,16,46,0.06)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #E5E7EB",
            fontSize: 13,
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
          formatter={(value) => [`${Number(value).toFixed(1)} mi`, "Mileage"]}
        />
        <Bar dataKey="miles" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.highlight ? "#C8102E" : "#111111"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
