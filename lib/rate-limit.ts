import { createHash } from "node:crypto";

import config from "@payload-config";
import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { sql } from "@payloadcms/db-postgres/drizzle";
import { getPayload } from "payload";

import { requireEnv } from "@/lib/env";

/**
 * Fixed-window rate limits stored in the `unlock-attempts` table, under keys
 * prefixed with a bucket name (e.g. "secret:<hashed ip>") so they never mix
 * with /unlock's own counters. One atomic statement per hit, so parallel
 * requests can't slip past the limit.
 */

/** Keyed hash of the client IP; the raw IP is never stored. */
export function hashedClientKey(request: Request, bucket: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const hash = createHash("sha256")
    .update(`${requireEnv("PAYLOAD_SECRET")}:${ip}`)
    .digest("hex");
  return `${bucket}:${hash}`;
}

/**
 * Counts one hit for `key` and says whether it's within `max` per
 * `windowMs`. Hits past the limit are still counted until the window ends.
 */
export async function takeRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const payload = await getPayload({ config });
  const db = payload.db as unknown as PostgresAdapter;
  const windowStart = new Date(Date.now() - windowMs).toISOString();
  const now = new Date().toISOString();
  const result = await db.drizzle.execute(sql`
    INSERT INTO unlock_attempts (key, count, window_start)
    VALUES (${key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN unlock_attempts.window_start < ${windowStart}
        THEN 1 ELSE unlock_attempts.count + 1 END,
      window_start = CASE WHEN unlock_attempts.window_start < ${windowStart}
        THEN ${now}::timestamptz ELSE unlock_attempts.window_start END,
      updated_at = now()
    RETURNING count
  `);
  const count = Number(result.rows[0]?.["count"] ?? Infinity);
  return count <= max;
}
