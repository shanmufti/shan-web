import config from "@payload-config";
import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { sql } from "@payloadcms/db-postgres/drizzle";
import { getPayload, type DataFromCollectionSlug } from "payload";

import { looksLikeToken } from "@/lib/tokens";

/**
 * Public side of file drops. The token is the only key; every lookup checks
 * expiry and the download limit, and anything invalid looks like a 404.
 */

type Drop = DataFromCollectionSlug<"file-drops">;
type VaultFile = DataFromCollectionSlug<"vault-files">;

export interface OpenDrop {
  id: number;
  file: VaultFile;
  expiresAt: string;
  note: string | null;
  downloadsLeft: number | null;
}

export function isDropOpen(
  drop: Pick<Drop, "expiresAt" | "maxDownloads" | "downloadCount">,
  now = new Date(),
): boolean {
  if (new Date(drop.expiresAt).getTime() <= now.getTime()) return false;
  const max = drop.maxDownloads;
  return typeof max !== "number" || (drop.downloadCount ?? 0) < max;
}

/** The drop for a token if it can still be downloaded, otherwise null. */
export async function findOpenDrop(token: string): Promise<OpenDrop | null> {
  if (!looksLikeToken(token)) return null;
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "file-drops",
    where: { token: { equals: token } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  const drop = docs[0];
  if (!drop || !isDropOpen(drop)) return null;
  if (typeof drop.file !== "object") return null;
  return {
    id: drop.id,
    file: drop.file,
    expiresAt: drop.expiresAt,
    note: drop.note ?? null,
    downloadsLeft:
      typeof drop.maxDownloads === "number"
        ? drop.maxDownloads - (drop.downloadCount ?? 0)
        : null,
  };
}

/**
 * Counts one download, atomically, only while the drop is still open.
 * Returns false if it expired or ran out in the meantime.
 */
export async function claimDownload(id: number): Promise<boolean> {
  const payload = await getPayload({ config });
  const db = payload.db as unknown as PostgresAdapter;
  const result = await db.drizzle.execute(sql`
    UPDATE file_drops
    SET download_count = COALESCE(download_count, 0) + 1
    WHERE id = ${id}
      AND expires_at > now()
      AND (max_downloads IS NULL OR COALESCE(download_count, 0) < max_downloads)
    RETURNING id
  `);
  return result.rows.length > 0;
}
