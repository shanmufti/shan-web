"use client";

import L, {
  type LatLngBoundsExpression,
  type LatLngTuple,
  type Map as LeafletMap,
  type Marker as LeafletMarker,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import { Expand, LocateFixed, Shrink } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import { formatDate } from "@/lib/format-date";
import { stayLabel, type RouteStop } from "@/lib/journey-route";
import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL } from "@/lib/map-tiles";

export type { RouteStop };

/** GPS line segments; gaps between segments are flights or lost signal. */
export type RouteTrack = LatLngTuple[][];

// Matches --primary / --coral in light mode; Leaflet paths take plain colours.
const ROUTE = "#2f74b5";
const ACTIVE = "#d9653b";

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function pinIcon(n: number) {
  return L.divIcon({
    className: "",
    html: `<span class="route-pin">${String(n)}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

function sq(a: LatLngTuple, b: LatLngTuple) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

/** Index of the track point closest to `p` in the flattened track. */
function nearest(points: LatLngTuple[], p: LatLngTuple): number {
  let best = -1;
  let bestD = Infinity;
  points.forEach((q, i) => {
    const d = sq(p, q);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/** Fits the map to the route, and re-fits when `fitKey` changes. */
function FitRoute({
  bounds,
  single,
  fitKey,
}: Readonly<{
  bounds: LatLngBoundsExpression | undefined;
  single: LatLngTuple | undefined;
  fitKey: number;
}>) {
  const map = useMap();
  useEffect(() => {
    if (fitKey === 0) return;
    const animate = !reducedMotion();
    if (bounds) map.fitBounds(bounds, { padding: [40, 40], animate });
    else if (single) map.setView(single, 8, { animate });
  }, [fitKey, bounds, single, map]);
  return null;
}

/**
 * Scroll-wheel zoom only after the map is clicked or focused, so scrolling
 * the page never gets stuck on the map. Pinch and the zoom buttons always work.
 */
function WheelGuard() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const on = () => {
      map.scrollWheelZoom.enable();
    };
    const off = () => {
      map.scrollWheelZoom.disable();
    };
    map.on("click", on);
    map.on("focus", on);
    map.on("blur", off);
    container.addEventListener("mouseleave", off);
    return () => {
      map.off("click", on);
      map.off("focus", on);
      map.off("blur", off);
      container.removeEventListener("mouseleave", off);
    };
  }, [map]);
  return null;
}

/** Keeps the map's size right after layout changes (fullscreen, sheet). */
function SizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(map.getContainer());
    return () => {
      observer.disconnect();
    };
  }, [map]);
  return null;
}

export function RouteMap({
  stops,
  track = [],
  selected = null,
  highlighted = null,
  onSelect,
}: Readonly<{
  stops: RouteStop[];
  track?: RouteTrack;
  /** Stop picked in the list or on the map; the map flies to it. */
  selected?: number | null;
  /** Stop hovered in the list; its marker is highlighted. */
  highlighted?: number | null;
  onSelect?: (index: number) => void;
}>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const markers = useRef<(LeafletMarker | null)[]>([]);
  const [fitKey, setFitKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const path = useMemo<LatLngTuple[]>(
    () => stops.map((s) => [s.lat, s.lng]),
    [stops],
  );
  // With a GPS track: solid lines, plus dashed hops joining one segment's end
  // to the next segment's start (flights, lost signal). Without one: a dashed
  // line straight from stop to stop.
  const dashed = useMemo<LatLngTuple[][]>(() => {
    if (track.length === 0) return path.length > 1 ? [path] : [];
    return track.slice(1).flatMap((seg, i) => {
      const prev = track[i]?.at(-1);
      const next = seg[0];
      return prev && next ? [[prev, next]] : [];
    });
  }, [track, path]);
  const { bounds, single } = useMemo(() => {
    const extent = [...path, ...track.flat()];
    return {
      single: extent.length === 1 ? extent[0] : undefined,
      bounds: extent.length > 1 ? extent : undefined,
    };
  }, [path, track]);

  // Stretch of track from the selected stop to the next one.
  const leg = useMemo<LatLngTuple[] | null>(() => {
    if (selected == null) return null;
    const from = path[selected];
    const to = path[selected + 1];
    if (!from || !to) return null;
    const flat = track.flat();
    if (flat.length === 0) return [from, to];
    const a = nearest(flat, from);
    const b = nearest(flat, to);
    return a >= 0 && b > a ? flat.slice(a, b + 1) : [from, to];
  }, [selected, path, track]);

  // Fly to the selected stop and open its popup.
  useEffect(() => {
    if (!map || selected == null) return;
    const point = path[selected];
    if (!point) return;
    const zoom = Math.max(map.getZoom(), 7);
    if (reducedMotion()) map.setView(point, zoom, { animate: false });
    else map.flyTo(point, zoom, { duration: 0.8 });
    markers.current[selected]?.openPopup();
  }, [map, selected, path]);

  // Fullscreen: the real API when there is one, else a fixed overlay.
  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === wrapRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, []);
  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (typeof el.requestFullscreen === "function") {
      el.requestFullscreen().catch(() => {
        setFullscreen((v) => !v);
      });
    } else {
      setFullscreen((v) => !v);
    }
  }, []);
  useEffect(() => {
    if (!fullscreen || document.fullscreenElement) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const active = selected ?? highlighted;

  // Icons stay the same objects so a marker keeps keyboard focus; the active
  // state is a class toggled on the existing element.
  const icons = useMemo(() => stops.map((_, i) => pinIcon(i + 1)), [stops]);
  useEffect(() => {
    markers.current.forEach((marker, i) => {
      const pin = marker?.getElement()?.querySelector(".route-pin");
      pin?.classList.toggle("is-active", i === active);
      marker?.setZIndexOffset(i === active ? 1000 : 0);
    });
  }, [active, map]);

  return (
    <div
      ref={wrapRef}
      data-route-map=""
      className={
        fullscreen && !document.fullscreenElement
          ? "route-map fixed inset-0 z-[60]"
          : "route-map relative size-full"
      }
    >
      <MapContainer
        ref={setMap}
        {...(bounds
          ? { bounds, boundsOptions: { padding: [40, 40] } }
          : { center: single ?? [20, 0], zoom: single ? 8 : 2 })}
        scrollWheelZoom={false}
        className="z-0 size-full"
        attributionControl
        keyboard
      >
        <TileLayer attribution={MAP_TILE_ATTRIBUTION} url={MAP_TILE_URL} />
        <FitRoute bounds={bounds} single={single} fitKey={fitKey} />
        <WheelGuard />
        <SizeWatcher />
        {track.length > 0 ? (
          <Polyline
            positions={track}
            pathOptions={{ color: ROUTE, weight: 2.5, opacity: 0.85 }}
          />
        ) : null}
        {dashed.length > 0 ? (
          <Polyline
            positions={dashed}
            pathOptions={{ color: ROUTE, weight: 1.5, dashArray: "4 6" }}
          />
        ) : null}
        {leg ? (
          <Polyline
            positions={leg}
            pathOptions={{ color: ACTIVE, weight: 4, opacity: 0.95 }}
          />
        ) : null}
        {stops.map((stop, index) => {
          const stay = stayLabel(stop.stayDays);
          return (
            <Marker
              key={`${stop.name}-${String(index)}`}
              ref={(m) => {
                markers.current[index] = m;
              }}
              position={[stop.lat, stop.lng]}
              icon={icons[index] ?? pinIcon(index + 1)}
              title={`Stop ${String(index + 1)}: ${stop.name}`}
              eventHandlers={{
                click: () => onSelect?.(index),
                // Markers are role="button" divs: Enter and Space select.
                keydown: (event) => {
                  const { key } = event.originalEvent;
                  if (key === "Enter" || key === " ") {
                    event.originalEvent.preventDefault();
                    onSelect?.(index);
                  }
                },
              }}
            >
              <Popup>
                <p className="route-popup-title">
                  {String(index + 1)}. {stop.name}
                </p>
                {stop.arrivedOn || stay ? (
                  <p className="route-popup-meta">
                    {[stop.arrivedOn ? formatDate(stop.arrivedOn) : null, stay]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            setFitKey((k) => k + 1);
          }}
          className="route-map-button"
          aria-label="Fit route"
          title="Fit route"
        >
          <LocateFixed className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="route-map-button"
          aria-label={fullscreen ? "Exit full screen" : "Full screen map"}
          aria-pressed={fullscreen}
          title={fullscreen ? "Exit full screen" : "Full screen"}
        >
          {fullscreen ? (
            <Shrink className="size-4" aria-hidden="true" />
          ) : (
            <Expand className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
