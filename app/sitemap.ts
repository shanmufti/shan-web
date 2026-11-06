import type { MetadataRoute } from "next";

import { listPublicForFeeds } from "@/lib/public-content";
import { siteUrl } from "@/lib/site-url";

// Rebuild hourly so new journeys and stories show up without a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const { journeys, stories, dives } = await listPublicForFeeds();

  const staticRoutes = [
    "",
    "/travel",
    "/travel/map",
    "/blog",
    "/diving",
    "/diving/logs",
    "/diving/skills",
    "/diving/resources",
    "/tech",
  ].map((path) => ({ url: `${base}${path}` }));

  return [
    ...staticRoutes,
    ...journeys.map((j) => ({
      url: `${base}/travel/${j.slug}`,
      lastModified: j.updatedAt,
    })),
    ...stories.map((s) => ({
      url: `${base}/blog/${s.slug}`,
      lastModified: s.updatedAt,
    })),
    ...dives.map((d) => ({
      url: `${base}/diving/logs/${d.slug}`,
      lastModified: d.updatedAt,
    })),
  ];
}
