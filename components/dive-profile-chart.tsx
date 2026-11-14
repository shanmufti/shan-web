"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ProfileSample } from "@/lib/shearwater-csv";

function formatAxisTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m)}:${String(s).padStart(2, "0")}`;
}

export function DiveProfileChart({
  samples,
}: Readonly<{ samples: ProfileSample[] }>) {
  if (samples.length === 0) return null;

  const data = samples.map((s) => ({
    t: s.t,
    depth: s.d,
  }));

  const maxDepth = Math.max(...data.map((d) => d.depth), 1);

  return (
    <div className="h-64 w-full sm:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          accessibilityLayer={false}
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatAxisTime}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="depth"
            type="number"
            reversed
            domain={[0, Math.ceil(maxDepth + 1)]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={48}
            unit=" m"
          />
          <Tooltip
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              return [`${n.toFixed(1)} m`, "Depth"];
            }}
            labelFormatter={(label) => {
              const n = typeof label === "number" ? label : Number(label);
              return `Time ${formatAxisTime(n)}`;
            }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
            }}
          />
          <Area
            type="monotone"
            dataKey="depth"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.14}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
