import config from "@payload-config";
import { cacheLife, cacheTag } from "next/cache";
import { getPayload, type CollectionSlug } from "payload";

import { collectionTag } from "@/lib/cache-tags";

/**
 * Does a share-link document exist? Cached (only a yes/no per slug, tagged
 * with the collection, so a create or delete expires it), which lets a
 * share page call notFound() before the response starts streaming: with
 * Cache Components an uncached lookup runs after the static shell has been
 * sent, so a missing slug would otherwise answer 200 with the 404 page.
 *
 * The page still reads the document itself per request; this only decides
 * the status code for slugs that don't exist.
 */
export async function shareSlugExists(
  collection: CollectionSlug,
  field: string,
  value: string,
): Promise<boolean> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 3_600, expire: 86_400 });
  cacheTag(collectionTag(collection));
  const payload = await getPayload({ config });
  const { totalDocs } = await payload.count({
    collection,
    where: { [field]: { equals: value } },
    overrideAccess: true,
  });
  return totalDocs > 0;
}
