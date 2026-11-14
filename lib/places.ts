import config from "@payload-config";
import { getPayload, type DataFromCollectionSlug } from "payload";

import { categoryLabel, PLACE_CATEGORIES } from "@/lib/google-maps-takeout";
import { currentViewer, visibleSections } from "@/lib/site-access";
import type { Viewer } from "@/lib/site-access-rules";

export type DestinationDoc = DataFromCollectionSlug<"destinations">;
export type PlaceDoc = DataFromCollectionSlug<"places">;

/**
 * Destinations and places are read with overrideAccess: true and filtered
 * here per viewer, like journeys (lib/journeys.ts):
 * - drafts and "Only me" places: owner only
 * - private destinations/places: owner or passcode holder
 * Everything here is per request; never wrap it in "use cache".
 */

function canSee(
  doc: { visibility?: string | null; draft?: boolean | null },
  viewer: Viewer,
): boolean {
  if (viewer === "owner") return true;
  if (doc.draft) return false;
  if (doc.visibility === "owner") return false;
  if (doc.visibility === "private") return viewer === "passcode";
  return true;
}

export interface DestinationSummary {
  slug: string;
  title: string;
  country: string | null;
  draft: boolean;
  firstVisit: string | null;
  placeCount: number;
}

function firstVisit(doc: DestinationDoc): string | null {
  const dates = (doc.datesVisited ?? [])
    .map((d) => d.from)
    .sort((a, b) => a.localeCompare(b));
  return dates[0] ?? null;
}

export async function listDestinations(): Promise<{
  viewer: Viewer;
  destinations: DestinationSummary[];
}> {
  const [payload, viewer] = await Promise.all([
    getPayload({ config }),
    currentViewer(),
  ]);
  const [{ docs }, places] = await Promise.all([
    payload.find({
      collection: "destinations",
      sort: "title",
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: "places",
      limit: 5000,
      depth: 0,
      pagination: false,
      select: { destination: true, visibility: true },
      overrideAccess: true,
    }),
  ]);
  const counts = new Map<string | number, number>();
  for (const place of places.docs) {
    if (!canSee(place, viewer)) continue;
    const id =
      typeof place.destination === "object"
        ? place.destination.id
        : place.destination;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return {
    viewer,
    destinations: docs
      .filter((d) => canSee(d, viewer))
      .map((d) => ({
        slug: d.slug,
        title: d.title,
        country: d.country ?? null,
        draft: Boolean(d.draft),
        firstVisit: firstVisit(d),
        placeCount: counts.get(d.id) ?? 0,
      })),
  };
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

export interface PlaceView {
  id: number;
  name: string;
  category: string;
  note: string | null;
  address: string | null;
  url: string | null;
  lat: number | null;
  lng: number | null;
  restricted: "private" | "owner" | null;
}

export interface PlaceGroup {
  category: string;
  label: string;
  places: PlaceView[];
}

export function groupPlaces(places: PlaceView[]): PlaceGroup[] {
  return PLACE_CATEGORIES.map((c) => ({
    category: c.value,
    label: categoryLabel(c.value),
    places: places
      .filter((p) => p.category === c.value)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.places.length > 0);
}

/** Only Google Maps links leave the site from a place row (always https). */
function safeMapsUrl(value: string | null | undefined): string | null {
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

export type DestinationPage =
  | { status: "missing" }
  | { status: "locked"; title: string }
  | {
      status: "ok";
      viewer: Viewer;
      doc: DestinationDoc;
      places: PlaceView[];
      /** Linked journeys this viewer may open (section visible, not draft). */
      journeys: { slug: string; title: string }[];
      previous: { slug: string; title: string } | null;
      next: { slug: string; title: string } | null;
    };

export async function getDestination(slug: string): Promise<DestinationPage> {
  const [payload, viewer] = await Promise.all([
    getPayload({ config }),
    currentViewer(),
  ]);
  const { docs } = await payload.find({
    collection: "destinations",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  const doc = docs[0];
  if (!doc) return { status: "missing" };
  if (doc.draft && viewer !== "owner") return { status: "missing" };
  if (!canSee(doc, viewer)) return { status: "locked", title: doc.title };

  const [{ docs: placeDocs }, { destinations }, sections] = await Promise.all([
    payload.find({
      collection: "places",
      where: { destination: { equals: doc.id } },
      sort: "name",
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    }),
    listDestinations(),
    visibleSections(),
  ]);
  const journeys = sections.some((s) => s.key === "journeys")
    ? (doc.journeys ?? []).flatMap((j) =>
        typeof j === "object" && canSee(j, viewer)
          ? [{ slug: j.slug, title: j.title }]
          : [],
      )
    : [];
  const places: PlaceView[] = placeDocs
    .filter((p) => canSee(p, viewer))
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      note: blankToNull(p.note),
      address: blankToNull(p.address),
      url: safeMapsUrl(p.googleMapsUrl),
      lat: p.coordinates?.lat ?? null,
      lng: p.coordinates?.lng ?? null,
      restricted:
        p.visibility === "private" || p.visibility === "owner"
          ? p.visibility
          : null,
    }));
  const index = destinations.findIndex((d) => d.slug === doc.slug);
  const pick = (i: number) => {
    const d = destinations[i];
    return d ? { slug: d.slug, title: d.title } : null;
  };
  return {
    status: "ok",
    viewer,
    doc,
    places,
    journeys,
    previous: index > 0 ? pick(index - 1) : null,
    next: index >= 0 ? pick(index + 1) : null,
  };
}
