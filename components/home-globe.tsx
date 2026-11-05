"use client";

import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";

export interface GlobePoint {
  lat: number;
  lng: number;
  label: string;
  href: string;
}

export interface GlobeArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export interface HomeGlobeProps {
  visitedCodes: string[];
  points: GlobePoint[];
  arcs: GlobeArc[];
  focus: { lat: number; lng: number } | null;
}

interface CountryProps {
  ISO_A3: string;
  NAME: string;
}

// The globe sits on a dark "night map" band in both themes, so colours are
// fixed here (three.js doesn't parse oklch()).
const OCEAN = "#132232";
const LAND = "rgba(255,255,255,0.09)";
const LAND_VISITED = "rgba(94,176,229,0.55)";
const BORDER = "rgba(255,255,255,0.10)";
const POINT = "#e8f3fb";
const ARC = "rgba(140,200,240,0.55)";

/** 2×1 solid-colour texture, so the globe needs no image download. */
function solidTexture(color: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 2, 1);
  return canvas.toDataURL();
}

function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ] ?? ch,
  );
}

const tooltip = (text: string) =>
  `<div style="font:500 12px/1.4 var(--font-geist-sans),sans-serif;padding:4px 8px;border-radius:6px;background:rgba(10,18,28,.9);color:#fff">${escapeHtml(text)}</div>`;

export function HomeGlobe({
  visitedCodes,
  points,
  arcs,
  focus,
}: Readonly<HomeGlobeProps>) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [countries, setCountries] = useState<Feature<Geometry, CountryProps>[]>(
    [],
  );
  // Rendered client-only (dynamic import, ssr: false), so document exists here.
  const [texture] = useState(() => solidTexture(OCEAN));

  const visited = useMemo(
    () => new Set(visitedCodes.map((code) => code.toUpperCase())),
    [visitedCodes],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/geo/world-countries.geojson")
      .then(
        (res) =>
          res.json() as Promise<FeatureCollection<Geometry, CountryProps>>,
      )
      .then((data) => {
        if (!cancelled) setCountries(data.features);
      })
      .catch(() => {
        // Globe still shows the ocean, pins and routes.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  function handleReady() {
    const globe = globeRef.current;
    if (!globe) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    globe.pointOfView(
      { lat: focus?.lat ?? 20, lng: focus?.lng ?? 0, altitude: 2.1 },
      reduceMotion ? 0 : 1200,
    );
    const controls = globe.controls();
    controls.enableZoom = false;
    controls.autoRotate = false;
  }

  return (
    <div ref={wrapRef} className="absolute inset-0">
      {size.width > 0 && texture ? (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={texture}
          showAtmosphere
          atmosphereColor="#7fb8e6"
          atmosphereAltitude={0.12}
          onGlobeReady={handleReady}
          polygonsData={countries}
          polygonAltitude={(d) =>
            visited.has(
              (d as Feature<Geometry, CountryProps>).properties.ISO_A3,
            )
              ? 0.012
              : 0.004
          }
          polygonCapColor={(d) =>
            visited.has(
              (d as Feature<Geometry, CountryProps>).properties.ISO_A3,
            )
              ? LAND_VISITED
              : LAND
          }
          polygonSideColor={() => "rgba(0,0,0,0)"}
          polygonStrokeColor={() => BORDER}
          polygonLabel={(d) => {
            const props = (d as Feature<Geometry, CountryProps>).properties;
            return visited.has(props.ISO_A3) ? tooltip(props.NAME) : "";
          }}
          polygonsTransitionDuration={0}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => POINT}
          pointAltitude={0.015}
          pointRadius={0.32}
          pointLabel={(d) => tooltip((d as GlobePoint).label)}
          onPointClick={(d) => {
            router.push((d as GlobePoint).href);
          }}
          arcsData={arcs}
          arcColor={() => ARC}
          arcStroke={0.35}
          arcAltitudeAutoScale={0.35}
        />
      ) : null}
    </div>
  );
}
