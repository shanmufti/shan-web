import config from "@payload-config";
import { cacheLife, cacheTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
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
  sectionForPath,
  type AccessMode,
  type SectionModes,
  type SiteSection,
} from "@/lib/site-sections";
import { TOOLS, type ToolEntry } from "@/lib/tools-registry";

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

export interface NavSection {
  href: string;
  label: string;
  /** Section is behind the shared passcode. */
  gated: boolean;
  /** This visitor still needs the passcode to open it. */
  locked: boolean;
}

/**
 * Header and footer sections, including passcode sections this viewer
 * hasn't unlocked yet (shown with a lock; the proxy sends them to /unlock).
 * Hidden sections stay out unless the owner is logged in.
 */
function navSectionsFor(modes: SectionModes, viewer: Viewer): NavSection[] {
  return SITE_SECTIONS.filter((s) => s.inNav).flatMap((s) => {
    const mode = modes[s.key];
    const open = canView(mode, viewer);
    if (!open && mode !== "passcode") return [];
    return [
      {
        href: s.href,
        label: s.label,
        gated: mode === "passcode",
        locked: !open,
      },
    ];
  });
}

/** Header and footer sections for this visitor. Per request. */
export async function navSections(): Promise<NavSection[]> {
  const [modes, viewer] = await Promise.all([
    getSectionModes(),
    currentViewer(),
  ]);
  return navSectionsFor(modes, viewer);
}

/** Header and footer sections as an anonymous visitor sees them. Cached. */
export async function publicNavSections(): Promise<NavSection[]> {
  return navSectionsFor(await getSectionModes(), "anonymous");
}

function modeOf(modes: SectionModes, key: string): AccessMode {
  // Unknown key: owner only, rather than leaking a link.
  return (modes as Record<string, AccessMode | undefined>)[key] ?? "owner";
}

/**
 * Tools this viewer can open: the tool's own section (sectionKey) and the
 * section that owns its page (e.g. /tools/json sits under Tools) must both
 * be open, so a hidden section never gets a link that would 404.
 */
export function toolsFor(modes: SectionModes, viewer: Viewer): ToolEntry[] {
  return TOOLS.filter((tool) => {
    if (tool.sectionKey && !canView(modeOf(modes, tool.sectionKey), viewer)) {
      return false;
    }
    const owner = sectionForPath(tool.href);
    return !owner || canView(modeOf(modes, owner.key), viewer);
  });
}

/** Tools from lib/tools-registry.ts that this visitor can open. Per request. */
export async function visibleTools(): Promise<ToolEntry[]> {
  const [modes, viewer] = await Promise.all([
    getSectionModes(),
    currentViewer(),
  ]);
  return toolsFor(modes, viewer);
}

/** Tools anyone can open. Cached: safe for static shells. */
export async function publicTools(): Promise<ToolEntry[]> {
  return toolsFor(await getSectionModes(), "anonymous");
}

/** For owner-only pages: 404 for everyone else, even if the proxy let them in. */
export async function requireOwner(): Promise<void> {
  if ((await currentViewer()) !== "owner") notFound();
}
