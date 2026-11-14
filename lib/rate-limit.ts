import { createHash } from "node:crypto";

import { headers } from "next/headers";
import type { Payload } from "payload";

import { requireEnv } from "@/lib/env";

/**
 * Fixed-window rate limit per visitor (keyed hash of the IP, never the raw
 * IP). Reuses the hidden `unlock-attempts` collection as a counter store;
 * the bucket name is part of the hashed key, so counts never mix with the
 * /unlock form's.
 */
async function visitorKey(bucket: string): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";
  return createHash("sha256")
    .update(`${requireEnv("PAYLOAD_SECRET")}:${bucket}:${ip}`)
    .digest("hex");
}

/**
 * Counts one hit for this visitor in `bucket`. Returns true (and doesn't
 * count) once they've used `max` hits in the current window.
 */
export async function overRateLimit(
  payload: Payload,
  bucket: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const key = await visitorKey(bucket);
  const { docs } = await payload.find({
    collection: "unlock-attempts",
    where: { key: { equals: key } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const entry = docs[0];
  const now = new Date();
  if (!entry) {
    await payload.create({
      collection: "unlock-attempts",
      data: { key, count: 1, windowStart: now.toISOString() },
      overrideAccess: true,
    });
    return false;
  }
  const expired =
    now.getTime() - new Date(entry.windowStart).getTime() >= windowMs;
  if (!expired && entry.count >= max) return true;
  await payload.update({
    collection: "unlock-attempts",
    id: entry.id,
    data: expired
      ? { count: 1, windowStart: now.toISOString() }
      : { count: entry.count + 1 },
    overrideAccess: true,
  });
  return false;
}
