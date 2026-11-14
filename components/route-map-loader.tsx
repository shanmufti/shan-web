"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import type { RouteMap as RouteMapType } from "./route-map";

// Leaflet only loads in the browser, in its own chunk, after the page.
const RouteMap = dynamic(
  () => import("./route-map").then((mod) => mod.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="bg-muted size-full animate-pulse"
        role="status"
        aria-label="Loading map"
      />
    ),
  },
);

export function RouteMapLoader(
  props: Readonly<ComponentProps<typeof RouteMapType>>,
) {
  return <RouteMap {...props} />;
}
