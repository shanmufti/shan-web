"use client";

import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { LatLngBoundsExpression, Layer, Path, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, ZoomControl } from "react-leaflet";

export interface VisitedCountry {
  country: string;
  yearsVisited: number[] | null;
  /** ISO 3166-2 state or province codes; when set, only these are shaded. */
  regions?: string[] | null;
  note?: string | null;
}

interface CountryProperties {
  ISO_A3: string;
  NAME: string;
}

interface RegionProperties {
  CODE: string;
  NAME: string;
}

// The inhabited world, so the first view fills the frame without Antarctica.
const WORLD: LatLngBoundsExpression = [
  [-56, -168],
  [78, 190],
];

// Flat, tile-free map. Borders are drawn in the sea colour so they read as
// thin gaps; CSS variables keep it right in dark mode.
const BORDER: PathOptions = {
  color: "var(--color-muted)",
  weight: 0.7,
  opacity: 1,
};
const LAND: PathOptions = {
  ...BORDER,
  fillColor: "var(--color-border)",
  fillOpacity: 1,
};
const VISITED: PathOptions = {
  ...BORDER,
  fillColor: "var(--color-primary)",
  fillOpacity: 0.88,
};

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function tooltipHtml(name: string, visited?: VisitedCountry): string {
  const parts = [`<strong>${escapeHtml(name)}</strong>`];
  const years = visited?.yearsVisited?.length
    ? [...visited.yearsVisited].sort((a, b) => a - b).join(" · ")
    : null;
  if (years) parts.push(`<span class="map-tooltip-meta">${years}</span>`);
  if (visited?.note) parts.push(escapeHtml(visited.note));
  return parts.join("<br />");
}

/** Hover lift for one shape; `base` is its resting style. */
function addHover(layer: Layer, base: PathOptions, visited: boolean) {
  const path = layer as Path;
  path.on("mouseover", () => {
    path.setStyle(
      visited
        ? { fillOpacity: 1, weight: 1.2 }
        : { fillColor: "var(--color-muted-foreground)", fillOpacity: 0.35 },
    );
    if (visited) path.bringToFront();
  });
  path.on("mouseout", () => {
    path.setStyle(base);
  });
}

function loadGeojson<P>(
  url: string,
  onLoad: (data: FeatureCollection<Geometry, P>) => void,
): () => void {
  let cancelled = false;
  fetch(url)
    .then((res) => res.json() as Promise<FeatureCollection<Geometry, P>>)
    .then((data) => {
      if (!cancelled) onLoad(data);
    })
    .catch(() => {
      // Map stays empty; the page still works without it.
    });
  return () => {
    cancelled = true;
  };
}

function Stat({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <span>
      <span className="text-foreground font-medium tabular-nums">{value}</span>{" "}
      {label}
    </span>
  );
}

export function CountriesMap({
  visitedCountries,
}: Readonly<{
  visitedCountries: VisitedCountry[];
}>) {
  const [countries, setCountries] = useState<FeatureCollection<
    Geometry,
    CountryProperties
  > | null>(null);
  const [regions, setRegions] = useState<FeatureCollection<
    Geometry,
    RegionProperties
  > | null>(null);

  const visitedByCode = useMemo(
    () => new Map(visitedCountries.map((c) => [c.country.toUpperCase(), c])),
    [visitedCountries],
  );
  const visitedRegions = useMemo(
    () =>
      new Set(
        visitedCountries.flatMap((c) =>
          (c.regions ?? []).map((code) => code.trim().toUpperCase()),
        ),
      ),
    [visitedCountries],
  );
  const needsRegions = visitedRegions.size > 0;

  useEffect(
    () =>
      loadGeojson<CountryProperties>(
        "/geo/world-countries.geojson",
        setCountries,
      ),
    [],
  );
  useEffect(
    () =>
      needsRegions
        ? loadGeojson<RegionProperties>("/geo/regions.geojson", setRegions)
        : undefined,
    [needsRegions],
  );

  // Only visited states and provinces are drawn; the rest of their country
  // stays plain land.
  const shadedRegions = useMemo(
    () =>
      regions
        ? {
            ...regions,
            features: regions.features.filter((f) =>
              visitedRegions.has(f.properties.CODE),
            ),
          }
        : null,
    [regions, visitedRegions],
  );

  const states = [...visitedRegions].filter((c) => c.startsWith("US-")).length;
  const provinces = [...visitedRegions].filter((c) =>
    c.startsWith("CA-"),
  ).length;

  function countryStyle(
    feature?: Feature<Geometry, CountryProperties>,
  ): PathOptions {
    const visited = feature
      ? visitedByCode.get(feature.properties.ISO_A3)
      : undefined;
    // A country listed by region is shaded region by region instead.
    return visited && !visited.regions?.length ? VISITED : LAND;
  }

  return (
    <div className="border-border bg-muted relative overflow-hidden rounded-xl border">
      <div className="text-muted-foreground sm:bg-background/85 pointer-events-none flex flex-wrap gap-x-3 gap-y-1 px-3.5 pt-3 text-xs sm:absolute sm:top-3 sm:left-3 sm:z-[400] sm:rounded-full sm:py-1.5 sm:shadow-sm sm:backdrop-blur">
        <Stat value={visitedCountries.length} label="countries" />
        {states > 0 ? <Stat value={states} label="US states" /> : null}
        {provinces > 0 ? (
          <Stat value={provinces} label="Canadian provinces" />
        ) : null}
      </div>
      <MapContainer
        bounds={WORLD}
        boundsOptions={{ padding: [12, 12] }}
        maxBounds={[
          [-70, -220],
          [85, 220],
        ]}
        maxBoundsViscosity={1}
        // Below 1 so the whole world still fits on a phone.
        minZoom={0}
        zoomSnap={0.25}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        className="travel-map aspect-[4/3] w-full sm:aspect-[16/9]"
        // Leaflet's own grey would show as the sea; use the theme colour.
        style={{ background: "var(--color-muted)" }}
      >
        <ZoomControl position="bottomright" />
        {countries ? (
          <GeoJSON
            data={countries}
            style={countryStyle}
            onEachFeature={(
              feature: Feature<Geometry, CountryProperties>,
              layer: Layer,
            ) => {
              const visited = visitedByCode.get(feature.properties.ISO_A3);
              const shaded = Boolean(visited && !visited.regions?.length);
              layer.bindTooltip(tooltipHtml(feature.properties.NAME, visited), {
                sticky: true,
                direction: "top",
                offset: [0, -8],
                className: "map-tooltip",
              });
              addHover(layer, shaded ? VISITED : LAND, shaded);
            }}
          />
        ) : null}
        {shadedRegions ? (
          <GeoJSON
            key={[...visitedRegions].join(",")}
            data={shadedRegions}
            style={() => VISITED}
            onEachFeature={(
              feature: Feature<Geometry, RegionProperties>,
              layer: Layer,
            ) => {
              layer.bindTooltip(tooltipHtml(feature.properties.NAME), {
                sticky: true,
                direction: "top",
                offset: [0, -8],
                className: "map-tooltip",
              });
              addHover(layer, VISITED, true);
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
