import config from "@payload-config";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { cache } from "react";

import {
  isValidAccessToken,
  PRIVATE_ACCESS_COOKIE,
} from "@/lib/private-access";
import { getSectionModes } from "@/lib/section-modes";
import { canView, type Viewer } from "@/lib/site-access-rules";
import {
  SITE_SECTIONS,
  type AccessMode,
  type SiteSection,
} from "@/lib/site-sections";
import { TOOLS, type ToolEntry } from "@/lib/tools-registry";

/** Who is looking, for server components. Cached per request. */
export const currentViewer = cache(async (): Promise<Viewer> => {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (user) return "owner";
  const token = (await cookies()).get(PRIVATE_ACCESS_COOKIE)?.value;
  return (await isValidAccessToken(payload, token)) ? "passcode" : "anonymous";
});

/** Sections this visitor can open, in display order. */
export const visibleSections = cache(async (): Promise<SiteSection[]> => {
  const payload = await getPayload({ config });
  const [modes, viewer] = await Promise.all([
    getSectionModes(payload),
    currentViewer(),
  ]);
  return SITE_SECTIONS.filter((s) => canView(modes[s.key], viewer));
});

/** Sections open to anyone (for the sitemap and feeds). */
export async function publicSectionKeys(): Promise<Set<string>> {
  const payload = await getPayload({ config });
  const modes = await getSectionModes(payload);
  return new Set(
    SITE_SECTIONS.filter((s) => modes[s.key] === "public").map((s) => s.key),
  );
}

/** Header and footer links: sections this visitor is allowed to open. */
export async function navLinks(): Promise<{ href: string; label: string }[]> {
  const sections = await visibleSections();
  return sections
    .filter((s) => s.inNav)
    .map((s) => ({ href: s.href, label: s.label }));
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
 * Header and footer sections, including passcode sections this visitor
 * hasn't unlocked yet (shown with a lock; the proxy sends them to /unlock).
 * Hidden sections stay out unless the owner is logged in.
 */
export const navSections = cache(async (): Promise<NavSection[]> => {
  const payload = await getPayload({ config });
  const [modes, viewer] = await Promise.all([
    getSectionModes(payload),
    currentViewer(),
  ]);
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
});

/** Tools from lib/tools-registry.ts that this visitor can open. */
export async function visibleTools(): Promise<ToolEntry[]> {
  const payload = await getPayload({ config });
  const [modes, viewer] = await Promise.all([
    getSectionModes(payload),
    currentViewer(),
  ]);
  return TOOLS.filter((tool) => {
    if (!tool.sectionKey) return true;
    const mode = (modes as Record<string, AccessMode | undefined>)[
      tool.sectionKey
    ];
    // Unknown key: only the owner sees it, rather than leaking a link.
    return canView(mode ?? "owner", viewer);
  });
}

/** For owner-only pages: 404 for everyone else, even if the proxy let them in. */
export async function requireOwner(): Promise<void> {
  if ((await currentViewer()) !== "owner") notFound();
}
