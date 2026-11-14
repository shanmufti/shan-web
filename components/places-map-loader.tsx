"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import type { MapPlace } from "./places-map";

const PlacesMap = dynamic(
  () => import("./places-map").then((mod) => mod.PlacesMap),
  {
    ssr: false,
    loading: () => <div className="bg-muted size-full animate-pulse" />,
  },
);

/**
 * Loads Leaflet only when the map box nears the viewport, so the page's
 * write-up isn't held up by the map bundle and tiles.
 */
export function PlacesMapLoader({
  places,
  center,
}: Readonly<{ places: MapPlace[]; center: [number, number] | null }>) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className="size-full">
      {visible ? (
        <PlacesMap places={places} center={center} />
      ) : (
        <div className="bg-muted size-full" />
      )}
    </div>
  );
}
