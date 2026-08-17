"use server";

import config from "@payload-config";
import { getPayload } from "payload";

/**
 * No-login toggle for the public share view. overrideAccess:true is scoped
 * by the caller supplying the correct shareSlug — same trust model as the
 * read path in lib/content.ts's getPackingListByShareSlug.
 */
export async function togglePackingItem(
  shareSlug: string,
  itemIndex: number,
  checked: boolean,
): Promise<{ error?: string }> {
  try {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "packing-lists",
      where: { shareSlug: { equals: shareSlug } },
      limit: 1,
      overrideAccess: true,
    });
    const doc = docs[0];
    if (!doc) return { error: "List not found." };

    const items = doc.items ?? [];
    if (itemIndex < 0 || itemIndex >= items.length) {
      return { error: "Item not found." };
    }

    const nextItems = items.map((item, i) =>
      i === itemIndex ? { ...item, checked } : item,
    );

    await payload.update({
      collection: "packing-lists",
      id: doc.id,
      data: { items: nextItems },
      overrideAccess: true,
    });

    return {};
  } catch (err) {
    console.error(err);
    return { error: "Could not save. Try again." };
  }
}
