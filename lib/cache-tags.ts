/**
 * Cache tags for CMS data. Pure strings, safe to import anywhere (proxy,
 * Payload config, server components).
 *
 * Every cached read tags itself with the collections and globals it depends
 * on (including ones it populates through relationships). Payload's
 * afterChange/afterDelete hooks (lib/revalidate.ts) expire the matching tag,
 * so an edit in /admin shows on the next request.
 */

export function collectionTag(slug: string): string {
  return `collection:${slug}`;
}

export function globalTag(slug: string): string {
  return `global:${slug}`;
}

/**
 * cacheLife for CMS reads. Payload hooks expire tags on every edit; the
 * daily revalidate is only a safety net for changes made outside Payload
 * (scripts, direct SQL). `stale` is how long the browser may reuse it.
 */
export const CONTENT_CACHE_LIFE = {
  stale: 300,
  revalidate: 86_400,
  expire: 30 * 86_400,
} as const;

export const SITE_ACCESS_TAG = globalTag("site-access");
export const SITE_SETTINGS_TAG = globalTag("site-settings");
export const LANDING_PAGE_TAG = globalTag("landing-page");
