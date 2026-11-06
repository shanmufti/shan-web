"use client";

import type { LatLngBoundsExpression, LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
} from "react-leaflet";

export interface RouteStop {
  name: string;
  lat: number;
  lng: number;
}

/** GPS line segments; gaps between segments are flights or lost signal. */
export type RouteTrack = LatLngTuple[][];

// Thin CSS-free styling: blue route over a quiet greyscale basemap.
const ROUTE = "#2f74b5";

export function RouteMap({
  stops,
  track = [],
}: Readonly<{ stops: RouteStop[]; track?: RouteTrack }>) {
  const path: LatLngTuple[] = stops.map((s) => [s.lat, s.lng]);
  // With a GPS track: solid lines, plus dashed hops joining one segment's end
  // to the next segment's start (flights, lost signal). Without one: a dashed
  // line straight from stop to stop.
  const hops: LatLngTuple[][] = track.slice(1).flatMap((seg, i) => {
    const prev = track[i]?.at(-1);
    const next = seg[0];
    return prev && next ? [[prev, next]] : [];
  });
  const fallback = path.length > 1 ? [path] : [];
  const dashed = track.length > 0 ? hops : fallback;
  const extent = [...path, ...track.flat()];
  const single = extent.length === 1 ? extent[0] : undefined;
  const bounds: LatLngBoundsExpression | undefined =
    extent.length > 1 ? extent : undefined;

  return (
    <MapContainer
      {...(bounds
        ? { bounds, boundsOptions: { padding: [40, 40] } }
        : { center: single ?? [20, 0], zoom: single ? 8 : 2 })}
      scrollWheelZoom={false}
      className="z-0 h-full w-full"
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {track.length > 0 ? (
        <Polyline
          positions={track}
          pathOptions={{ color: ROUTE, weight: 2.5, opacity: 0.9 }}
        />
      ) : null}
      {dashed.length > 0 ? (
        <Polyline
          positions={dashed}
          pathOptions={{ color: ROUTE, weight: 1.5, dashArray: "4 6" }}
        />
      ) : null}
      {stops.map((stop, index) => (
        <CircleMarker
          key={`${stop.name}-${String(index)}`}
          center={[stop.lat, stop.lng]}
          radius={5}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: ROUTE,
            fillOpacity: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            {String(index + 1)}. {stop.name}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
