"use client";

import dynamic from "next/dynamic";

import type { RouteStop, RouteTrack } from "./route-map";

const RouteMap = dynamic(
  () => import("./route-map").then((mod) => mod.RouteMap),
  {
    ssr: false,
    loading: () => <div className="bg-muted size-full animate-pulse" />,
  },
);

export function RouteMapLoader({
  stops,
  track,
}: Readonly<{ stops: RouteStop[]; track?: RouteTrack }>) {
  return <RouteMap stops={stops} {...(track ? { track } : {})} />;
}
