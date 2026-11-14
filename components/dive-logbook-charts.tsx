"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface DivesPerYear {
  year: string;
  dives: number;
}

export interface DiveDepthPoint {
  /** Short label for the axis and tooltip, e.g. "Apr 2024". */
  label: string;
  title: string;
  depth: number;
}

const tick = { fontSize: 11, fill: "var(--muted-foreground)" };
const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
};

/** Bar per year: how many dives were logged. One series, so no legend. */
export function DivesPerYearChart({
  data,
}: Readonly<{ data: DivesPerYear[] }>) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        accessibilityLayer={false}
        data={data}
        margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
      >
        <CartesianGrid
          vertical={false}
          stroke="var(--border)"
          strokeDasharray="0"
        />
        <XAxis dataKey="year" tick={tick} tickLine={false} axisLine={false} />
        <YAxis
          allowDecimals={false}
          tick={tick}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={tooltipStyle}
          formatter={(value) => [String(value), "Dives"]}
        />
        <Bar
          dataKey="dives"
          fill="var(--chart-1)"
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Max depth of each dive, oldest to newest, bars hanging down from 0 m. */
export function DiveDepthsChart({
  data,
}: Readonly<{ data: DiveDepthPoint[] }>) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        accessibilityLayer={false}
        data={data}
        margin={{ top: 0, right: 4, left: -16, bottom: 0 }}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={tick}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          reversed
          unit=" m"
          tick={tick}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={tooltipStyle}
          labelFormatter={(_, payload) => {
            const point = payload[0]?.payload as DiveDepthPoint | undefined;
            return point ? `${point.title} · ${point.label}` : "";
          }}
          formatter={(value) => [`${String(value)} m`, "Max depth"]}
        />
        <Bar
          dataKey="depth"
          fill="var(--chart-1)"
          radius={[0, 0, 4, 4]}
          maxBarSize={18}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
