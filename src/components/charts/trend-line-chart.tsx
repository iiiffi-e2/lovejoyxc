"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendPoint = { label: string; value: number | null };

export function TrendLineChart({
  data,
  domain = [1, 10],
  color = "#C8102E",
  unit = "",
}: {
  data: TrendPoint[];
  domain?: [number, number];
  color?: string;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 600 }}
        />
        <YAxis
          domain={domain}
          tickLine={false}
          axisLine={false}
          width={36}
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #E5E7EB",
            fontSize: 13,
          }}
          formatter={(value) => [`${value}${unit}`, ""]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={3}
          dot={{ r: 4, fill: color }}
          activeDot={{ r: 6 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
