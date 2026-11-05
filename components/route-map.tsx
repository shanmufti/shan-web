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

// Thin CSS-free styling: blue route over a quiet greyscale basemap.
const ROUTE = "#2f74b5";

export function RouteMap({ stops }: Readonly<{ stops: RouteStop[] }>) {
  const path: LatLngTuple[] = stops.map((s) => [s.lat, s.lng]);
  const single = path.length === 1 ? path[0] : undefined;
  const bounds: LatLngBoundsExpression | undefined =
    path.length > 1 ? path : undefined;

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
      {path.length > 1 ? (
        <Polyline
          positions={path}
          pathOptions={{ color: ROUTE, weight: 2, dashArray: "4 6" }}
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
