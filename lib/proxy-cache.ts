import config from "@payload-config";
import { getPayload } from "payload";

import { SITE_ACCESS_TAG, SITE_SETTINGS_TAG } from "@/lib/cache-tags";
import { memo } from "@/lib/memo-cache";
import { getPasscodeHash } from "@/lib/private-access";
import { fallbackModes, loadSectionModes } from "@/lib/section-modes";
import {
  isAccessMode,
  resolveModes,
  type SectionModes,
} from "@/lib/site-sections";

/**
 * Cached reads for proxy.ts.
 *
 * Proxy can't use `"use cache"`, so section modes come from
 * /site-modes.json: a prerendered route cached under the site-access tag
 * (expired by the global's hook), served without touching the database.
 * A short in-process memo avoids refetching it on every request; the hook
 * clears that too (lib/revalidate.ts → clearMemo).
 */

const MEMO_TTL_MS = 10_000;

function parseModes(value: unknown): SectionModes | null {
  if (!value || typeof value !== "object") return null;
  // Every value must be a known mode, or we don't trust the response.
  if (!Object.values(value).every(isAccessMode)) return null;
  return resolveModes(value);
}

async function fetchModes(origin: string, cookie: string | null) {
  const res = await fetch(`${origin}/site-modes.json`, {
    // Vercel deployment protection (preview deploys) needs the visitor's
    // bypass cookie; it's our own origin.
    headers: cookie ? { cookie } : {},
    cache: "no-store",
    signal: AbortSignal.timeout(3_000),
  });
  if (!res.ok) throw new Error(`site-modes.json: ${String(res.status)}`);
  const modes = parseModes(await res.json());
  if (!modes) throw new Error("site-modes.json: unexpected body");
  return modes;
}

/**
 * Section modes. Falls back to reading the database directly if the cached
 * route can't be fetched, and to each section's default (fail closed) if
 * that fails too.
 */
export async function proxySectionModes(
  origin: string,
  cookie: string | null,
): Promise<SectionModes> {
  try {
    return await memo(SITE_ACCESS_TAG, MEMO_TTL_MS, async () => {
      try {
        return await fetchModes(origin, cookie);
      } catch {
        return await loadSectionModes();
      }
    });
  } catch {
    return fallbackModes();
  }
}

/**
 * Stored passcode hash (only read for passcode sections when the visitor
 * has a passcode cookie). Null on error, so nobody is let in.
 */
export async function proxyPasscodeHash(): Promise<string | null> {
  try {
    return await memo(SITE_SETTINGS_TAG, MEMO_TTL_MS, async () =>
      getPasscodeHash(await getPayload({ config })),
    );
  } catch {
    return null;
  }
}
