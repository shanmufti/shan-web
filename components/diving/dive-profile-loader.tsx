"use client";

import dynamic from "next/dynamic";

import type { ProfileSample } from "@/lib/shearwater-csv";

// Recharts loads in its own chunk, in the browser only.
const DiveProfileChart = dynamic(
  () => import("./dive-profile-chart").then((m) => m.DiveProfileChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/60 h-64 w-full animate-pulse rounded-lg sm:h-96" />
    ),
  },
);

export function DiveProfileLoader({
  samples,
}: Readonly<{ samples: ProfileSample[] }>) {
  return <DiveProfileChart samples={samples} />;
}
