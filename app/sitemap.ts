import type { MetadataRoute } from "next";

import { listPublicHobbySlugs } from "@/lib/hobbies";
import { listPublicForFeeds } from "@/lib/public-content";
import { publicSectionKeys } from "@/lib/site-access";
import { siteUrl } from "@/lib/site-url";

// Rebuild hourly so new journeys and stories show up without a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [open, { journeys, stories, dives }, hobbies] = await Promise.all([
    publicSectionKeys(),
    listPublicForFeeds(),
    listPublicHobbySlugs(),
  ]);
  const url = (path: string) => ({ url: `${base}${path}` });

  // Only sections open to everyone in /admin → Access & permissions.
  return [
    url(""),
    ...(open.has("journeys")
      ? [
          url("/travel"),
          url("/travel/map"),
          ...journeys.map((j) => ({
            url: `${base}/travel/${j.slug}`,
            lastModified: j.updatedAt,
          })),
        ]
      : []),
    ...(open.has("stories")
      ? [
          url("/blog"),
          ...stories.map((s) => ({
            url: `${base}/blog/${s.slug}`,
            lastModified: s.updatedAt,
          })),
        ]
      : []),
    ...(open.has("diving")
      ? [
          url("/diving"),
          url("/diving/logs"),
          url("/diving/skills"),
          url("/diving/resources"),
          ...dives.map((d) => ({
            url: `${base}/diving/logs/${d.slug}`,
            lastModified: d.updatedAt,
          })),
        ]
      : []),
    ...(open.has("tech") ? [url("/tech")] : []),
    ...(open.has("hobbies")
      ? [
          url("/hobbies"),
          ...hobbies.map((h) => ({
            url: `${base}/hobbies/${h.slug}`,
            lastModified: h.updatedAt,
          })),
        ]
      : []),
    ...(open.has("tools") ? [url("/tools"), url("/tools/snippets")] : []),
  ];
}
