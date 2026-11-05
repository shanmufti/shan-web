"use client";

import dynamic from "next/dynamic";

import type { RouteStop } from "./route-map";

const RouteMap = dynamic(
  () => import("./route-map").then((mod) => mod.RouteMap),
  {
    ssr: false,
    loading: () => <div className="bg-muted size-full animate-pulse" />,
  },
);

export function RouteMapLoader({ stops }: Readonly<{ stops: RouteStop[] }>) {
  return <RouteMap stops={stops} />;
}
