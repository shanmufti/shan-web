import type { JourneyDoc, TrackSegment } from "@/lib/journeys";

/**
 * Route data for the journey page's map and stop list. Plain objects only,
 * so they can be handed to the client map.
 */

export interface RouteStop {
  name: string;
  lat: number;
  lng: number;
  /** ISO date the stop was reached, when known. */
  arrivedOn?: string | undefined;
  /** ISO 3166-1 alpha-3, upper case. */
  countryCode?: string | undefined;
  /** Nights until the next stop (or the journey's end), when both dates exist. */
  stayDays?: number | undefined;
}

const DAY_MS = 86_400_000;

function daysBetween(from: string, to: string): number | undefined {
  const ms = Date.parse(to) - Date.parse(from);
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / DAY_MS) : undefined;
}

/** Stops in travel order with stay lengths; falls back to the main location. */
export function routeStops(journey: JourneyDoc): RouteStop[] {
  const raw = journey.stops ?? [];
  const stops: RouteStop[] = raw.map((stop, i) => {
    const next =
      raw[i + 1]?.arrivedOn ?? (i === raw.length - 1 ? journey.endDate : null);
    return {
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      arrivedOn: stop.arrivedOn ?? undefined,
      countryCode: stop.countryCode?.toUpperCase() ?? undefined,
      stayDays:
        stop.arrivedOn && next ? daysBetween(stop.arrivedOn, next) : undefined,
    };
  });
  const { name, lat, lng } = journey.location;
  if (stops.length === 0 && lat != null && lng != null) {
    stops.push({ name, lat, lng, arrivedOn: journey.startDate });
  }
  return stops;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Distance along the GPS track in km (segments only; the gaps between them
 * are flights or lost signal and aren't counted). null without a track.
 */
export function trackDistanceKm(track: TrackSegment[]): number | null {
  if (track.length === 0) return null;
  let km = 0;
  for (const segment of track) {
    for (let i = 1; i < segment.length; i++) {
      const a = segment[i - 1];
      const b = segment[i];
      if (a && b) km += haversineKm(a, b);
    }
  }
  return Math.round(km);
}

/** "3 nights", "1 night", "Day trip". */
export function stayLabel(days: number | undefined): string | undefined {
  if (days == null) return undefined;
  if (days === 0) return "Day trip";
  return days === 1 ? "1 night" : `${String(days)} nights`;
}
