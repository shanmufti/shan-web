import config from "@payload-config";
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
): Promise<DataFromCollectionSlug<T> | null> {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection,
    where: {
      and: [{ slug: { equals: slug } }, { draft: { equals: false } }],
    },
    limit: 1,
    overrideAccess: false,
  });
  return docs[0] ?? null;
}

/** List published docs for an index page. */
export async function listPublished<T extends ContentCollection>(
  collection: T,
  options?: { sort?: string; limit?: number },
): Promise<DataFromCollectionSlug<T>[]> {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection,
    where: { draft: { equals: false } },
    sort: options?.sort ?? "-date",
    limit: options?.limit ?? 100,
    overrideAccess: false,
  });
  return docs;
}
