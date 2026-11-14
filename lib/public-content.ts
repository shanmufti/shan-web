import config from "@payload-config";
import { cacheLife, cacheTag } from "next/cache";
import { getPayload } from "payload";

import { collectionTag, CONTENT_CACHE_LIFE } from "@/lib/cache-tags";

/**
 * Anonymous reads for feeds and the sitemap. overrideAccess: false applies the
 * collection access rules, so drafts and private items never appear.
 */
export async function listPublicForFeeds() {
  "use cache";
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(
    collectionTag("travel"),
    collectionTag("blog"),
    collectionTag("diving"),
  );
  const payload = await getPayload({ config });
  const [journeys, stories, dives] = await Promise.all([
    payload.find({
      collection: "travel",
      sort: "-startDate",
      limit: 1000,
      depth: 0,
      overrideAccess: false,
    }),
    payload.find({
      collection: "blog",
      sort: "-date",
      limit: 1000,
      depth: 0,
      overrideAccess: false,
    }),
    payload.find({
      collection: "diving",
      where: { draft: { equals: false } },
      sort: "-date",
      limit: 1000,
      depth: 0,
      overrideAccess: false,
    }),
  ]);
  return {
    journeys: journeys.docs,
    stories: stories.docs,
    dives: dives.docs,
  };
}
