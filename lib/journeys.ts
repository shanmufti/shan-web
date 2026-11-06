import config from "@payload-config";
import { cookies } from "next/headers";
import { getPayload, type DataFromCollectionSlug } from "payload";
import { cache } from "react";

import { getCurrentUser } from "@/lib/content";
import { countryName } from "@/lib/country-names";
import {
  isValidAccessToken,
  PRIVATE_ACCESS_COOKIE,
} from "@/lib/private-access";

export type JourneyDoc = DataFromCollectionSlug<"travel">;
export type StoryDoc = DataFromCollectionSlug<"blog">;

/**
 * Journeys and stories are read with overrideAccess: true and filtered here,
 * because Local API calls don't carry the visitor's passcode cookie. Rules:
 * - drafts never leave the server (except to the logged-in owner, via /admin)
 * - private items: full doc only when unlocked; otherwise a locked teaser
 *   with title + date only, or nothing when `hideWhenLocked` is set.
 */

/** Owner, or a visitor holding a valid passcode cookie. Cached per request. */
export const hasPrivateAccess = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (user) return true;
  const jar = await cookies();
  const token = jar.get(PRIVATE_ACCESS_COOKIE)?.value;
  const payload = await getPayload({ config });
  return isValidAccessToken(payload, token);
});

function isPrivate(doc: { visibility?: string | null }) {
  return doc.visibility === "private";
}

export function mediaUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const media = value as {
    url?: string | null;
    sizes?: Record<string, { url?: string | null } | undefined> | null;
  };
  return media.sizes?.["card"]?.url ?? media.url ?? undefined;
}

export function mediaAlt(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const alt = (value as { alt?: string | null }).alt;
  return alt ?? undefined;
}

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

export async function listJourneys(): Promise<Listed<JourneyDoc>[]> {
  const [payload, unlocked] = await Promise.all([
    getPayload({ config }),
    hasPrivateAccess(),
  ]);
  const { docs } = await payload.find({
    collection: "travel",
    where: { draft: { equals: false } },
    sort: "-startDate",
    limit: 500,
    depth: 1,
    joins: { stories: { limit: 100, where: { draft: { equals: false } } } },
    overrideAccess: true,
  });
  return toListed(docs, unlocked, (doc) => ({
    date: doc.startDate,
    endDate: doc.endDate,
  }));
}

export async function listStories(): Promise<Listed<StoryDoc>[]> {
  const [payload, unlocked] = await Promise.all([
    getPayload({ config }),
    hasPrivateAccess(),
  ]);
  const { docs } = await payload.find({
    collection: "blog",
    where: { draft: { equals: false } },
    sort: "-date",
    limit: 500,
    depth: 1,
    overrideAccess: true,
  });
  return toListed(docs, unlocked, (doc) => ({ date: doc.date }));
}

/** Story's parent journey, if populated and visible to this visitor. */
export function storyJourney(
  story: StoryDoc,
): { slug: string; title: string } | null {
  const journey = story.journey;
  if (!journey || typeof journey !== "object") return null;
  return { slug: journey.slug, title: journey.title };
}

// ---------------------------------------------------------------------------
// Single pages

export type PageResult<T> =
  | { status: "ok"; doc: T }
  | { status: "locked"; title: string }
  | { status: "missing" };

export async function getJourney(
  slug: string,
): Promise<PageResult<JourneyDoc>> {
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
  const doc = docs[0];
  if (!doc) return { status: "missing" };
  if (isPrivate(doc) && !(await hasPrivateAccess())) {
    return { status: "locked", title: doc.title };
  }
  return { status: "ok", doc };
}

export async function getStory(slug: string): Promise<PageResult<StoryDoc>> {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "blog",
    where: { and: [{ slug: { equals: slug } }, { draft: { equals: false } }] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  const doc = docs[0];
  if (!doc) return { status: "missing" };
  if (isPrivate(doc) && !(await hasPrivateAccess())) {
    return { status: "locked", title: doc.title };
  }
  return { status: "ok", doc };
}

/** Journeys before/after this one, by start date (visible to this visitor). */
export async function adjacentJourneys(current: JourneyDoc) {
  const all = (await listJourneys()).filter(
    (item): item is { locked: false; doc: JourneyDoc } => !item.locked,
  );
  const index = all.findIndex((item) => item.doc.id === current.id);
  // List is newest first: "newer" is index - 1, "older" is index + 1.
  return {
    newer: index > 0 ? all[index - 1]?.doc : undefined,
    older: index >= 0 ? all[index + 1]?.doc : undefined,
  };
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
  return raw
    .filter((seg): seg is unknown[] => Array.isArray(seg))
    .map((seg) => seg.filter(isCoord))
    .filter((seg) => seg.length > 1);
}
