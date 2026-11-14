import config from "@payload-config";
import { cacheLife, cacheTag } from "next/cache";
import { getPayload } from "payload";

import { collectionTag, CONTENT_CACHE_LIFE } from "@/lib/cache-tags";
import { PLACE_CATEGORIES } from "@/lib/google-maps-takeout";
import type { Viewer } from "@/lib/site-access-rules";

/**
 * Saved Google Maps places, shown on the journeys their destination links
 * to (destinations.journeys). There are no standalone destination pages.
 *
 * The cached read below includes private and "Only me" places; it is only
 * handed to server code, and `placesFor` filters it per viewer before
 * anything renders (anonymous view in the static shell, the rest inside a
 * <Suspense> boundary that checks the viewer per request). The
 * destination's own draft flag is ignored: the journey's access decides.
 */

export type PlaceVisibility = "public" | "private" | "owner";

export interface PlaceView {
  id: number;
  name: string;
  category: string;
  note: string | null;
  url: string | null;
  /** Strictest of the place's and its destination's visibility. */
  visibility: PlaceVisibility;
}

export interface DestinationPlaces {
  id: number;
  title: string;
  places: PlaceView[];
}

export interface PlaceGroup {
  category: string;
  label: string;
  places: PlaceView[];
}

const RANK: Record<PlaceVisibility, number> = {
  public: 0,
  private: 1,
  owner: 2,
};

function asVisibility(value: string | null | undefined): PlaceVisibility {
  return value === "private" || value === "owner" ? value : "public";
}

function stricter(a: PlaceVisibility, b: PlaceVisibility): PlaceVisibility {
  return RANK[a] >= RANK[b] ? a : b;
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

/** Only Google Maps links leave the site from a place row (always https). */
export function safeMapsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    const google =
      /^(maps\.)?google\.[a-z.]+$/.test(host) || host === "maps.app.goo.gl";
    if (!google || !["http:", "https:"].includes(url.protocol)) return null;
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Places of every destination linked to a journey, by destination title.
 * Includes private and owner-only places: filter with `placesFor`.
 */
export async function journeyPlaceDocs(
  journeyId: number,
): Promise<DestinationPlaces[]> {
  "use cache";
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag("destinations"), collectionTag("places"));
  const payload = await getPayload({ config });
  const { docs: destinations } = await payload.find({
    collection: "destinations",
    where: { journeys: { equals: journeyId } },
    sort: "title",
    limit: 100,
    depth: 0,
    pagination: false,
    select: { title: true, visibility: true },
    overrideAccess: true,
  });
  if (destinations.length === 0) return [];
  const { docs: places } = await payload.find({
    collection: "places",
    where: { destination: { in: destinations.map((d) => d.id) } },
    sort: "name",
    limit: 5000,
    depth: 0,
    pagination: false,
    select: {
      name: true,
      category: true,
      note: true,
      googleMapsUrl: true,
      visibility: true,
      destination: true,
    },
    overrideAccess: true,
  });

  // A place belongs to one destination, but the same Google place can be
  // saved twice under different keys: keep the first by id and by link.
  const seenIds = new Set<number>();
  const seenUrls = new Set<string>();
  const byDestination = new Map<number, PlaceView[]>();
  const destinationVisibility = new Map(
    destinations.map((d) => [d.id, asVisibility(d.visibility)]),
  );
  for (const p of places) {
    const destId =
      typeof p.destination === "object" ? p.destination.id : p.destination;
    const url = safeMapsUrl(p.googleMapsUrl);
    if (seenIds.has(p.id) || (url && seenUrls.has(url))) continue;
    seenIds.add(p.id);
    if (url) seenUrls.add(url);
    const list = byDestination.get(destId) ?? [];
    list.push({
      id: p.id,
      name: p.name,
      category: p.category,
      note: blankToNull(p.note),
      url,
      visibility: stricter(
        asVisibility(p.visibility),
        destinationVisibility.get(destId) ?? "public",
      ),
    });
    byDestination.set(destId, list);
  }
  return destinations.map((d) => ({
    id: d.id,
    title: d.title,
    places: byDestination.get(d.id) ?? [],
  }));
}

export function canSeePlace(place: PlaceView, viewer: Viewer): boolean {
  if (place.visibility === "public" || viewer === "owner") return true;
  return place.visibility === "private" && viewer === "passcode";
}

/** The destinations and places this viewer may see; empty ones dropped. */
export function placesFor(
  destinations: DestinationPlaces[],
  viewer: Viewer,
): DestinationPlaces[] {
  return destinations
    .map((d) => ({
      ...d,
      places: d.places.filter((p) => canSeePlace(p, viewer)),
    }))
    .filter((d) => d.places.length > 0);
}

/** True when some place needs a passcode or the owner to be seen. */
export function hasRestrictedPlaces(destinations: DestinationPlaces[]) {
  return destinations.some((d) =>
    d.places.some((p) => p.visibility !== "public"),
  );
}

const GROUP_LABELS: Record<string, string> = {
  restaurant: "Restaurants",
  cafe: "Cafes",
  bar: "Bars and nightlife",
  sight: "Sights",
  nature: "Nature and outdoors",
  viewpoint: "Viewpoints",
  activity: "Activities",
  hotel: "Hotels",
  "dive-shop": "Dive shops",
  shop: "Shops",
  town: "Towns and areas",
  practical: "Practical",
  other: "Other places",
};

/**
 * Places by category, in the importer's category order. Inside a category,
 * places with a note (my recommendations) come first, then A to Z, so they
 * stay above the "Show all" fold and links to them from the write-up land.
 */
export function groupPlaces(places: PlaceView[]): PlaceGroup[] {
  const known = new Set<string>(PLACE_CATEGORIES.map((c) => c.value));
  return PLACE_CATEGORIES.map((c) => ({
    category: c.value,
    label: GROUP_LABELS[c.value] ?? c.label,
    places: places
      .filter((p) =>
        c.value === "other"
          ? p.category === "other" || !known.has(p.category)
          : p.category === c.value,
      )
      .sort(
        (a, b) =>
          Number(b.note !== null) - Number(a.note !== null) ||
          a.name.localeCompare(b.name),
      ),
  })).filter((g) => g.places.length > 0);
}
