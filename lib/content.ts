import config from "@payload-config";
import { headers as getHeaders } from "next/headers";
import { getPayload, type DataFromCollectionSlug } from "payload";

export type ContentCollection = "blog" | "diving" | "travel" | "tech";

/**
 * Fetch one published doc by slug.
 * Always uses overrideAccess: false so collection access (drafts hidden
 * from anonymous readers) applies even through the Local API.
 */
export async function getPublishedBySlug<T extends ContentCollection>(
  collection: T,
  slug: string,
  options?: { depth?: number },
): Promise<DataFromCollectionSlug<T> | null> {
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

/** List published docs for an index page. */
export async function listPublished<T extends ContentCollection>(
  collection: T,
  options?: { sort?: string; limit?: number; depth?: number },
): Promise<DataFromCollectionSlug<T>[]> {
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

export async function getCurrentUser() {
  const headers = await getHeaders();
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers });
  return user;
}

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
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "visited-countries",
    limit: 300,
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
