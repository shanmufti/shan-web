"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { parseItemLines } from "@/lib/shared-lists";

export interface CreateListState {
  error?: string;
}

/** Owner only: makes a list and opens its share page. */
export async function createSharedList(
  _prev: CreateListState,
  formData: FormData,
): Promise<CreateListState> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) return { error: "Log in first." };

  const rawTitle = formData.get("title");
  const title =
    typeof rawTitle === "string" ? rawTitle.trim().slice(0, 120) : "";
  if (!title) return { error: "Give the list a title." };
  const rawItems = formData.get("items");
  const items = parseItemLines(typeof rawItems === "string" ? rawItems : "");

  let shareSlug: string;
  try {
    const doc = await payload.create({
      collection: "shared-lists",
      data: {
        title,
        items: items.map((label) => ({ label, checked: false })),
      },
      user,
      overrideAccess: false,
    });
    shareSlug = doc.shareSlug ?? "";
  } catch (err) {
    console.error(err);
    return { error: "Couldn't create the list. Try again." };
  }
  redirect(`/lists/${shareSlug}`);
}
