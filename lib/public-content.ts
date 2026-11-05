import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Anonymous reads for feeds and the sitemap. overrideAccess: false applies the
 * collection access rules, so drafts and private items never appear.
 */
export async function listPublicForFeeds() {
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
