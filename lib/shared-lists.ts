import { randomBytes } from "node:crypto";

import config from "@payload-config";
import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { sql } from "@payloadcms/db-postgres/drizzle";
import { getPayload } from "payload";

import { looksLikeToken } from "@/lib/tokens";

/**
 * Public side of shared lists. The share slug is the only key. Ticks and new
 * items are single SQL statements on the array table, so two people editing
 * at once never overwrite each other's changes (a whole-array Payload update
 * would).
 */

export const MAX_LIST_ITEMS = 300;
export const MAX_ITEM_LENGTH = 200;

export interface SharedListItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface SharedListView {
  title: string;
  items: SharedListItem[];
}

async function drizzle() {
  const payload = await getPayload({ config });
  return (payload.db as unknown as PostgresAdapter).drizzle;
}

export function looksLikeShareSlug(slug: string): boolean {
  return looksLikeToken(slug);
}

export async function getSharedList(
  shareSlug: string,
): Promise<SharedListView | null> {
  if (!looksLikeShareSlug(shareSlug)) return null;
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "shared-lists",
    where: { shareSlug: { equals: shareSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = docs[0];
  if (!doc) return null;
  return {
    title: doc.title,
    items: (doc.items ?? []).map((item) => ({
      id: item.id ?? "",
      label: item.label,
      checked: Boolean(item.checked),
    })),
  };
}

/** Ticks or unticks one item. False if the list or item doesn't exist. */
export async function setItemChecked(
  shareSlug: string,
  itemId: string,
  checked: boolean,
): Promise<boolean> {
  if (!looksLikeShareSlug(shareSlug)) return false;
  const result = await (
    await drizzle()
  ).execute(sql`
    WITH list AS (
      UPDATE shared_lists SET updated_at = now()
      WHERE share_slug = ${shareSlug}
      RETURNING id
    )
    UPDATE shared_lists_items SET checked = ${checked}
    WHERE id = ${itemId} AND _parent_id IN (SELECT id FROM list)
    RETURNING id
  `);
  return result.rows.length > 0;
}

/** Appends an item. False if the list doesn't exist or is full. */
export async function addItem(
  shareSlug: string,
  label: string,
): Promise<boolean> {
  if (!looksLikeShareSlug(shareSlug)) return false;
  // Same shape as Payload's own array row ids (24 hex characters).
  const id = randomBytes(12).toString("hex");
  const result = await (
    await drizzle()
  ).execute(sql`
    WITH list AS (
      UPDATE shared_lists SET updated_at = now()
      WHERE share_slug = ${shareSlug}
      RETURNING id
    )
    INSERT INTO shared_lists_items (_order, _parent_id, id, label, checked)
    SELECT COALESCE(MAX(i._order), 0) + 1, list.id, ${id}, ${label}, false
    FROM list
    LEFT JOIN shared_lists_items i ON i._parent_id = list.id
    GROUP BY list.id
    HAVING COUNT(i.id) < ${MAX_LIST_ITEMS}
    RETURNING id
  `);
  return result.rows.length > 0;
}

/** Splits pasted text into item labels: one per line, blanks dropped. */
export function parseItemLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\[[ x]\])\s*/i, "").trim())
    .filter((line) => line !== "")
    .map((line) => line.slice(0, MAX_ITEM_LENGTH))
    .slice(0, MAX_LIST_ITEMS);
}
