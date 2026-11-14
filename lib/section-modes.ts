import config from "@payload-config";
import { getPayload } from "payload";

import { resolveModes, type SectionModes } from "@/lib/site-sections";

/**
 * Reads section access modes from the `site-access` global, uncached.
 * Throws on a DB error so callers never cache a failure; see
 * getSectionModes (pages) and lib/proxy-cache.ts (proxy) for cached reads
 * that fail closed.
 */
export async function loadSectionModes(): Promise<SectionModes> {
  const payload = await getPayload({ config });
  const doc = await payload.findGlobal({
    slug: "site-access",
    overrideAccess: true,
    depth: 0,
  });
  return resolveModes(doc.sections);
}

/** Fail closed: each section's default mode (Hidden for most). */
export function fallbackModes(): SectionModes {
  return resolveModes(null);
}
