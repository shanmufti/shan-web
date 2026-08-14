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
    <section className="mt-10">
      <h2 className="font-heading text-base font-semibold">Dive profile</h2>
      <div className="mt-4 h-56 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={formatAxisTime}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              dataKey="depth"
              type="number"
              reversed
              domain={[0, Math.ceil(maxDepth + 1)]}
              tick={{ fontSize: 11 }}
              width={40}
              unit=" m"
              className="text-muted-foreground"
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
                borderRadius: 6,
              }}
            />
            <Area
              type="monotone"
              dataKey="depth"
              stroke="var(--foreground)"
              fill="var(--muted)"
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
