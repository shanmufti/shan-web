import config from "@payload-config";
import { cacheLife, cacheTag } from "next/cache";
import { getPayload, type DataFromCollectionSlug } from "payload";

import { collectionTag, CONTENT_CACHE_LIFE } from "@/lib/cache-tags";
import { countryName } from "@/lib/country-names";

export type JourneyDoc = DataFromCollectionSlug<"travel">;
export type StoryDoc = DataFromCollectionSlug<"blog">;

/**
 * Journeys and stories are read with overrideAccess: true and filtered here,
 * because Local API calls don't carry the visitor's passcode cookie. Rules:
 * - drafts never leave the server (except to the logged-in owner, via /admin)
 * - private items: full doc only when unlocked; otherwise a locked teaser
 *   with title + date only, or nothing when `hideWhenLocked` is set.
 *
 * Caching: the raw reads below are `"use cache"` and include private docs,
 * but they are only ever handed to server code. Whether a visitor is
 * unlocked is decided per request (lib/site-access.ts → hasPrivateAccess),
 * always inside a <Suspense> boundary, and the filtering happens after the
 * cache. Pages render private content only behind that check, so it never
 * reaches a static shell.
 */

export function isPrivate(doc: { visibility?: string | null }) {
  return doc.visibility === "private";
}

export { mediaAlt, mediaImage, mediaUrl } from "@/lib/media";

export function journeyCountries(journey: JourneyDoc): string[] {
  const codes = new Set<string>();
  for (const stop of journey.stops ?? []) {
    if (stop.countryCode) codes.add(stop.countryCode.toUpperCase());
  }
  return [...codes];
}

export function journeyCountryNames(journey: JourneyDoc): string[] {
  const names = journeyCountries(journey).map(countryName);
  return names.length > 0 ? names : [journey.location.name];
}

export function journeyDays(journey: JourneyDoc): number | null {
  if (!journey.endDate) return null;
  const ms =
    new Date(journey.endDate).getTime() - new Date(journey.startDate).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

// ---------------------------------------------------------------------------
// Cached reads (published docs, private ones included; filter before use)

/** Journeys populate covers, dive logs and (via join) stories. */
function tagJourneys() {
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(
    collectionTag("travel"),
    collectionTag("blog"),
    collectionTag("diving"),
    collectionTag("media"),
  );
}

/** Stories populate their cover and parent journey. */
function tagStories() {
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(
    collectionTag("blog"),
    collectionTag("travel"),
    collectionTag("media"),
  );
}

/** Every published journey, newest first. Includes private ones. */
export async function journeyDocs(): Promise<JourneyDoc[]> {
  "use cache";
  tagJourneys();
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "travel",
    where: { draft: { equals: false } },
    sort: "-startDate",
    limit: 500,
    depth: 1,
    joins: { stories: { limit: 100, where: { draft: { equals: false } } } },
    overrideAccess: true,
  });
  return docs;
}

/** Every published story, newest first. Includes private ones. */
export async function storyDocs(): Promise<StoryDoc[]> {
  "use cache";
  tagStories();
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "blog",
    where: { draft: { equals: false } },
    sort: "-date",
    limit: 500,
    depth: 1,
    overrideAccess: true,
  });
  return docs;
}

/** One published journey by slug, or null. May be private. */
export async function journeyDoc(slug: string): Promise<JourneyDoc | null> {
  "use cache";
  tagJourneys();
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "travel",
    where: { and: [{ slug: { equals: slug } }, { draft: { equals: false } }] },
    limit: 1,
    depth: 2,
    joins: {
      stories: {
        limit: 100,
        sort: "date",
        where: { draft: { equals: false } },
      },
    },
    overrideAccess: true,
  });
  return docs[0] ?? null;
}

/** One published story by slug, or null. May be private. */
export async function storyDoc(slug: string): Promise<StoryDoc | null> {
  "use cache";
  tagStories();
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "blog",
    where: { and: [{ slug: { equals: slug } }, { draft: { equals: false } }] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  return docs[0] ?? null;
}

// ---------------------------------------------------------------------------
// Listings

export interface LockedTeaser {
  locked: true;
  id: number | string;
  slug: string;
  title: string;
  date: string;
  endDate?: string | null | undefined;
}

export type Listed<T> = { locked: false; doc: T } | LockedTeaser;

function toListed<
  T extends {
    id: number | string;
    slug: string;
    title: string;
    visibility?: string | null;
    hideWhenLocked?: boolean | null;
  },
>(
  docs: T[],
  unlocked: boolean,
  dates: (doc: T) => { date: string; endDate?: string | null | undefined },
): Listed<T>[] {
  const out: Listed<T>[] = [];
  for (const doc of docs) {
    if (!isPrivate(doc) || unlocked) {
      out.push({ locked: false, doc });
    } else if (!doc.hideWhenLocked) {
      out.push({
        locked: true,
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        ...dates(doc),
      });
    }
  }
  return out;
}

/** Journeys as this visitor sees them (`unlocked`: has private access). */
export function listJourneys(
  docs: JourneyDoc[],
  unlocked: boolean,
): Listed<JourneyDoc>[] {
  return toListed(docs, unlocked, (doc) => ({
    date: doc.startDate,
    endDate: doc.endDate,
  }));
}

/** Stories as this visitor sees them (`unlocked`: has private access). */
export function listStories(
  docs: StoryDoc[],
  unlocked: boolean,
): Listed<StoryDoc>[] {
  return toListed(docs, unlocked, (doc) => ({ date: doc.date }));
}

/** Story's parent journey, if populated. */
export function storyJourney(
  story: StoryDoc,
): { slug: string; title: string } | null {
  const journey = story.journey;
  if (!journey || typeof journey !== "object") return null;
  return { slug: journey.slug, title: journey.title };
}

/** Journeys before/after this one, by start date, among `docs`. */
export function adjacentJourneys(docs: JourneyDoc[], current: JourneyDoc) {
  const index = docs.findIndex((doc) => doc.id === current.id);
  // List is newest first: "newer" is index - 1, "older" is index + 1.
  return {
    newer: index > 0 ? docs[index - 1] : undefined,
    older: index >= 0 ? docs[index + 1] : undefined,
  };
}

/** Journeys a visitor without private access may see. */
export function publicJourneys(docs: JourneyDoc[]): JourneyDoc[] {
  return docs.filter((doc) => !isPrivate(doc));
}

// ---------------------------------------------------------------------------
// Rich text helpers

/** Rough reading time from Lexical JSON (~220 words per minute). */
export function readingMinutes(body: unknown): number {
  let words = 0;
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { text?: unknown; children?: unknown; root?: unknown };
    if (typeof n.text === "string") {
      words += n.text.split(/\s+/).filter(Boolean).length;
    }
    if (Array.isArray(n.children)) n.children.forEach(walk);
    if (n.root) walk(n.root);
  };
  walk(body);
  return Math.max(1, Math.round(words / 220));
}

/** Route stops, falling back to the journey's main location. */
export function journeyStops(
  journey: JourneyDoc,
): { name: string; lat: number; lng: number }[] {
  const stops = (journey.stops ?? []).map((s) => ({
    name: s.name,
    lat: s.lat,
    lng: s.lng,
  }));
  const { name, lat, lng } = journey.location;
  if (stops.length === 0 && lat != null && lng != null) {
    stops.push({ name, lat, lng });
  }
  return stops;
}

export type TrackSegment = [number, number][];

const isCoord = (p: unknown): p is [number, number] =>
  Array.isArray(p) &&
  p.length === 2 &&
  typeof p[0] === "number" &&
  typeof p[1] === "number" &&
  Math.abs(p[0]) <= 90 &&
  Math.abs(p[1]) <= 180;

/** GPS route segments from the `track` JSON field; [] when missing or malformed. */
export function journeyTrack(journey: JourneyDoc): TrackSegment[] {
  const raw = journey.track;
  if (!Array.isArray(raw)) return [];
  // A Payload update of the journey (e.g. saving it in /admin) rewrites each
  // segment array as an object with "0", "1", ... keys; read both shapes.
  const asArray = (seg: unknown): unknown[] | null => {
    if (Array.isArray(seg)) return seg as unknown[];
    if (seg && typeof seg === "object") return Object.values(seg) as unknown[];
    return null;
  };
  return raw
    .map(asArray)
    .filter((seg): seg is unknown[] => seg !== null)
    .map((seg) => seg.filter(isCoord))
    .filter((seg) => seg.length > 1);
}
