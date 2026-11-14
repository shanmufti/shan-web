"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import type { DiveDepthPoint, DivesPerYear } from "./dive-logbook-charts";

const chartLoading = () => (
  <div className="bg-muted/60 size-full animate-pulse rounded-lg" />
);

// Recharts only loads in the browser, after the page is up.
const DivesPerYearChart = dynamic(
  () => import("./dive-logbook-charts").then((m) => m.DivesPerYearChart),
  { ssr: false, loading: chartLoading },
);
const DiveDepthsChart = dynamic(
  () => import("./dive-logbook-charts").then((m) => m.DiveDepthsChart),
  { ssr: false, loading: chartLoading },
);

function ChartCard({
  title,
  summary,
  table,
  children,
  className,
}: Readonly<{
  title: string;
  summary: string;
  table: ReactNode;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <figure
      className={`bg-card border-border rounded-2xl border p-5 sm:p-6 ${className ?? ""}`}
    >
      <figcaption>
        <p className="eyebrow text-muted-foreground">{title}</p>
        <p className="mt-1 text-sm">{summary}</p>
      </figcaption>
      <div className="mt-4 h-44" aria-hidden="true">
        {children}
      </div>
      <details className="mt-3 text-sm">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer">
          Show as table
        </summary>
        <div className="mt-2 max-h-60 overflow-auto">{table}</div>
      </details>
    </figure>
  );
}

/** Logbook summary above the dive list: dives per year and max depths. */
export function DiveLogbook({
  perYear,
  depths,
}: Readonly<{ perYear: DivesPerYear[]; depths: DiveDepthPoint[] }>) {
  const busiest = [...perYear].sort((a, b) => b.dives - a.dives)[0];
  const deepest = [...depths].sort((a, b) => b.depth - a.depth)[0];
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <ChartCard
        title="Dives by year"
        summary={
          busiest
            ? `Most in ${busiest.year}: ${String(busiest.dives)}`
            : "No dives yet"
        }
        table={
          <table className="w-full text-left tabular-nums">
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-1 font-normal">Year</th>
                <th className="py-1 text-right font-normal">Dives</th>
              </tr>
            </thead>
            <tbody>
              {perYear.map((row) => (
                <tr key={row.year} className="border-border border-t">
                  <td className="py-1">{row.year}</td>
                  <td className="py-1 text-right">{row.dives}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <DivesPerYearChart data={perYear} />
      </ChartCard>
      <ChartCard
        title="Max depth per dive"
        summary={
          deepest
            ? `Deepest: ${String(deepest.depth)} m, ${deepest.title}`
            : "No depths logged"
        }
        table={
          <table className="w-full text-left tabular-nums">
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-1 font-normal">Dive</th>
                <th className="py-1 font-normal">When</th>
                <th className="py-1 text-right font-normal">Max depth</th>
              </tr>
            </thead>
            <tbody>
              {depths.map((row, i) => (
                <tr
                  key={`${row.title}-${String(i)}`}
                  className="border-border border-t"
                >
                  <td className="py-1">{row.title}</td>
                  <td className="py-1">{row.label}</td>
                  <td className="py-1 text-right">{row.depth} m</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <DiveDepthsChart data={depths} />
      </ChartCard>
    </div>
  );
}
