"use client";

import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";

import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL } from "@/lib/map-tiles";

export interface MapPlace {
  id: number;
  name: string;
  category: string;
  lat: number;
  lng: number;
}

// Same blue as the journey route map.
const PIN = "#2f74b5";

/** Scroll the list row for a pin into view and move focus to it. */
function revealRow(id: number) {
  const row = document.getElementById(`place-${String(id)}`);
  if (!row) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  row.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  row.focus({ preventScroll: true });
}

export function PlacesMap({
  places,
  center,
}: Readonly<{ places: MapPlace[]; center: [number, number] | null }>) {
  const points = places.map((p) => [p.lat, p.lng] as [number, number]);
  const bounds: LatLngBoundsExpression | undefined =
    points.length > 1 ? points : undefined;
  const single = points[0] ?? center;

  return (
    <MapContainer
      {...(bounds
        ? { bounds, boundsOptions: { padding: [32, 32], maxZoom: 15 } }
        : { center: single ?? [20, 0], zoom: single ? 13 : 2 })}
      scrollWheelZoom={false}
      className="travel-map z-0 h-full w-full"
      attributionControl
    >
      <TileLayer attribution={MAP_TILE_ATTRIBUTION} url={MAP_TILE_URL} />
      {places.map((place) => (
        <CircleMarker
          key={place.id}
          center={[place.lat, place.lng]}
          radius={6}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: PIN,
            fillOpacity: 1,
          }}
          eventHandlers={{
            click: () => {
              revealRow(place.id);
            },
          }}
        >
          <Tooltip direction="top" offset={[0, -6]} className="map-tooltip">
            {place.name}
            <br />
            <span className="map-tooltip-meta">{place.category}</span>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
