import config from "@payload-config";
import { cacheLife, cacheTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { getPayload } from "payload";
import { cache } from "react";

import {
  CONTENT_CACHE_LIFE,
  SITE_ACCESS_TAG,
  SITE_SETTINGS_TAG,
} from "@/lib/cache-tags";
import {
  getPasscodeHash,
  mayHaveSession,
  PRIVATE_ACCESS_COOKIE,
  tokenMatchesHash,
} from "@/lib/private-access";
import { loadSectionModes } from "@/lib/section-modes";
import { canView, type Viewer } from "@/lib/site-access-rules";
import {
  SITE_SECTIONS,
  type SectionModes,
  type SiteSection,
} from "@/lib/site-sections";

/**
 * Section modes for rendering. Same for every visitor, so cached. Throws on
 * a DB error rather than caching a fallback: a failed regeneration keeps the
 * last good page. Access itself is enforced in proxy.ts, which fails closed.
 */
export async function getSectionModes(): Promise<SectionModes> {
  "use cache";
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(SITE_ACCESS_TAG);
  return loadSectionModes();
}

async function cachedPasscodeHash(): Promise<string | null> {
  "use cache";
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(SITE_SETTINGS_TAG);
  return getPasscodeHash(await getPayload({ config }));
}

/**
 * Who is looking. Reads cookies, so call it only inside a <Suspense>
 * boundary (or a route that renders per request). Cached per request.
 *
 * Anonymous visitors without a session or passcode cookie are answered
 * without starting Payload or touching the database.
 */
export const currentViewer = cache(async (): Promise<Viewer> => {
  const [jar, headerList] = await Promise.all([cookies(), headers()]);
  if (
    mayHaveSession((name) => jar.has(name), headerList.get("authorization"))
  ) {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: headerList });
    if (user) return "owner";
  }
  const token = jar.get(PRIVATE_ACCESS_COOKIE)?.value;
  if (!token) return "anonymous";
  return tokenMatchesHash(token, await cachedPasscodeHash())
    ? "passcode"
    : "anonymous";
});

/** Owner, or a visitor holding a valid passcode cookie. Per request. */
export async function hasPrivateAccess(): Promise<boolean> {
  return (await currentViewer()) !== "anonymous";
}

function sectionsFor(modes: SectionModes, viewer: Viewer): SiteSection[] {
  return SITE_SECTIONS.filter((s) => canView(modes[s.key], viewer));
}

/** Sections this visitor can open, in display order. Per request. */
export async function visibleSections(): Promise<SiteSection[]> {
  const [modes, viewer] = await Promise.all([
    getSectionModes(),
    currentViewer(),
  ]);
  return sectionsFor(modes, viewer);
}

/** Sections anyone can open. Cached: safe for static shells. */
export async function publicSections(): Promise<SiteSection[]> {
  return sectionsFor(await getSectionModes(), "anonymous");
}

/** Sections open to anyone (for the sitemap and feeds). */
export async function publicSectionKeys(): Promise<Set<string>> {
  return new Set((await publicSections()).map((s) => s.key));
}

export interface NavLink {
  href: string;
  label: string;
}

function toNavLinks(sections: SiteSection[]): NavLink[] {
  return sections
    .filter((s) => s.inNav)
    .map((s) => ({ href: s.href, label: s.label }));
}

/** Header and footer links for this visitor. Per request. */
export async function navLinks(): Promise<NavLink[]> {
  return toNavLinks(await visibleSections());
}

/** Header and footer links for an anonymous visitor. Cached. */
export async function publicNavLinks(): Promise<NavLink[]> {
  return toNavLinks(await publicSections());
}
