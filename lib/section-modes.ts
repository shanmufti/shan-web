import type { Payload } from "payload";

import { resolveModes, type SectionModes } from "@/lib/site-sections";

/**
 * Reads section access modes from the `site-access` global. Kept free of
 * @payload-config imports so the global's own hook can clear the cache.
 */

// Short in-memory cache: the proxy reads modes on every page request.
const TTL_MS = 10_000;
let cached: { modes: SectionModes; at: number } | null = null;

export function clearAccessCache() {
  cached = null;
}

export async function getSectionModes(payload: Payload): Promise<SectionModes> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.modes;
  try {
    const doc = await payload.findGlobal({
      slug: "site-access",
      overrideAccess: true,
      depth: 0,
    });
    const modes = resolveModes(doc.sections);
    cached = { modes, at: Date.now() };
    return modes;
  } catch {
    // Table missing or DB hiccup: fail closed with the defaults.
    return resolveModes(null);
  }
}
