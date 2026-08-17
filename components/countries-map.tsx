"use client";

import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Layer, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";

export interface VisitedCountry {
  country: string;
  yearsVisited: number[] | null;
  note?: string | null;
}

interface CountryProperties {
  ISO_A3: string;
  NAME: string;
}

function popupHtml(name: string, visited: VisitedCountry | undefined) {
  if (!visited) return `<strong>${name}</strong>`;
  const years = visited.yearsVisited?.length
    ? visited.yearsVisited
        .slice()
        .sort((a, b) => a - b)
        .join(", ")
    : null;
  const parts = [`<strong>${name}</strong>`];
  if (years) parts.push(years);
  if (visited.note) parts.push(visited.note);
  return parts.join("<br />");
}

export function CountriesMap({
  visitedCountries,
}: Readonly<{
  visitedCountries: VisitedCountry[];
}>) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/geo/world-countries.geojson")
      .then((res) => res.json() as Promise<FeatureCollection>)
      .then((data) => {
        if (!cancelled) setGeojson(data);
      })
      .catch(() => {
        // Map stays empty; the page still shows the visited-countries list.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visitedByCode = useMemo(() => {
    const map = new Map<string, VisitedCountry>();
    for (const entry of visitedCountries) {
      map.set(entry.country.toUpperCase(), entry);
    }
    return map;
  }, [visitedCountries]);

  function style(feature?: Feature<Geometry, CountryProperties>): PathOptions {
    const visited = feature && visitedByCode.has(feature.properties.ISO_A3);
    return {
      fillColor: "var(--color-success)",
      fillOpacity: visited ? 0.55 : 0.05,
      color: "var(--color-border)",
      weight: 1,
    };
  }

  function onEachFeature(
    feature: Feature<Geometry, CountryProperties>,
    layer: Layer,
  ) {
    const visited = visitedByCode.get(feature.properties.ISO_A3);
    layer.bindPopup(popupHtml(feature.properties.NAME, visited));
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={1}
      className="h-[520px] w-full rounded-md"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geojson ? (
        <GeoJSON data={geojson} style={style} onEachFeature={onEachFeature} />
      ) : null}
    </MapContainer>
  );
}
