import config from "@payload-config";
import { cookies, headers } from "next/headers";
import { getPayload } from "payload";
import { cache } from "react";

import {
  isValidAccessToken,
  PRIVATE_ACCESS_COOKIE,
} from "@/lib/private-access";
import { getSectionModes } from "@/lib/section-modes";
import { canView, type Viewer } from "@/lib/site-access-rules";
import { SITE_SECTIONS, type SiteSection } from "@/lib/site-sections";

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
