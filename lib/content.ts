import config from "@payload-config";
import { cacheLife, cacheTag } from "next/cache";
import { cookies, headers as getHeaders } from "next/headers";
import { getPayload, type DataFromCollectionSlug } from "payload";
import { cache } from "react";

import { collectionTag, CONTENT_CACHE_LIFE } from "@/lib/cache-tags";
import { mayHaveSession } from "@/lib/private-access";

export type ContentCollection = "diving" | "travel" | "tech";

/**
 * Collections each content collection's docs can pull in through
 * relationships (depth > 0), so cached reads expire when those change too.
 */
const RELATED: Record<ContentCollection, string[]> = {
  diving: ["media", "dive-skills", "gear-configs", "dive-gear"],
  travel: ["diving", "media"],
  tech: ["media"],
};

/** Tag a `"use cache"` scope with a collection and what it populates. */
function tagContent(collection: ContentCollection) {
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(
    collectionTag(collection),
    ...RELATED[collection].map(collectionTag),
  );
}

/**
 * generateStaticParams helper: slugs to prerender at build time. Cache
 * Components needs at least one, so an empty collection yields a
 * placeholder slug that simply renders as a 404.
 */
export function staticSlugParams(docs: { slug: string }[]): { slug: string }[] {
  const params = docs.map((doc) => ({ slug: doc.slug }));
  return params.length > 0 ? params : [{ slug: "__none__" }];
}

/**
 * Fetch one published doc by slug. Cached (same for every visitor).
 * Always uses overrideAccess: false so collection access (drafts and
 * private items hidden from anonymous readers) applies even through the
 * Local API.
 */
export async function getPublishedBySlug<T extends ContentCollection>(
  collection: T,
  slug: string,
  options?: { depth?: number },
): Promise<DataFromCollectionSlug<T> | null> {
  "use cache";
  tagContent(collection);
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection,
    where: {
      and: [{ slug: { equals: slug } }, { draft: { equals: false } }],
    },
    limit: 1,
    depth: options?.depth ?? 0,
    overrideAccess: false,
  });
  return docs[0] ?? null;
}

/** List published docs for an index page. Cached (same for every visitor). */
export async function listPublished<T extends ContentCollection>(
  collection: T,
  options?: { sort?: string; limit?: number; depth?: number },
): Promise<DataFromCollectionSlug<T>[]> {
  "use cache";
  tagContent(collection);
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection,
    where: { draft: { equals: false } },
    sort: options?.sort ?? "-date",
    limit: options?.limit ?? 100,
    depth: options?.depth ?? 0,
    overrideAccess: false,
  });
  return docs;
}

/**
 * The logged-in Payload user, or null. Reads cookies, so call it only inside
 * a <Suspense> boundary or a per-request route. Visitors without a session
 * cookie are answered without starting Payload. Cached per request.
 */
export const getCurrentUser = cache(async () => {
  const [jar, headers] = await Promise.all([cookies(), getHeaders()]);
  if (!mayHaveSession((name) => jar.has(name), headers.get("authorization"))) {
    return null;
  }
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers });
  return user;
});

export type DiveDoc = DataFromCollectionSlug<"diving">;

export function diveMaxDepth(dive: DiveDoc): number | null {
  const value = dive.vitals?.maxDepthMeters;
  return typeof value === "number" ? value : null;
}

export function diveBottomTime(dive: DiveDoc): number | null {
  const value = dive.vitals?.bottomTimeMinutes;
  return typeof value === "number" ? value : null;
}

export function diveVisibility(dive: DiveDoc): number | null {
  const value = dive.vitals?.visibilityMeters;
  return typeof value === "number" ? value : null;
}

export async function listDiveSkills() {
  "use cache";
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag("dive-skills"));
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "dive-skills",
    sort: "category",
    limit: 200,
    overrideAccess: false,
  });
  return docs;
}

export async function listDiveResources() {
  "use cache";
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag("dive-resources"));
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "dive-resources",
    where: { draft: { equals: false } },
    sort: "-createdAt",
    limit: 100,
    overrideAccess: false,
  });
  return docs;
}

export async function listVisitedCountries() {
  "use cache";
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag("visited-countries"));
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "visited-countries",
    limit: 300,
    overrideAccess: false,
  });
  return docs;
}

/**
 * Looks up a packing list by its unguessable shareSlug. overrideAccess:true
 * is deliberate here — packing-lists is privateAccess, but the random slug
 * itself is the capability token for the public share link (same trust
 * model as the spec's original API-route proposal, just expressed as a
 * Server Action).
 */
export async function getPackingListByShareSlug(shareSlug: string) {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "packing-lists",
    where: { shareSlug: { equals: shareSlug } },
    limit: 1,
    overrideAccess: true,
  });
  return docs[0] ?? null;
}

export async function listPackingListTemplatesForUser() {
  const user = await getCurrentUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "packing-list-templates",
    sort: "name",
    limit: 100,
    user,
    overrideAccess: false,
  });
  return docs;
}

export async function listDiveGearForUser() {
  const user = await getCurrentUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const { docs: gear } = await payload.find({
    collection: "dive-gear",
    sort: "gearType",
    limit: 200,
    user,
    overrideAccess: false,
  });
  const { docs: configs } = await payload.find({
    collection: "gear-configs",
    sort: "name",
    limit: 50,
    user,
    overrideAccess: false,
  });
  return { gear, configs };
}
