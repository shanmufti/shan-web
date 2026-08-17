"use server";

import { nanoid } from "nanoid";
import config from "@payload-config";
import { getPayload } from "payload";
import { redirect } from "next/navigation";

export interface ClonePackingListState {
  error?: string;
}

export async function clonePackingList(
  _prev: ClonePackingListState,
  formData: FormData,
): Promise<ClonePackingListState> {
  const templateId = formData.get("templateId");
  if (typeof templateId !== "string" || templateId === "") {
    return { error: "Pick a template to clone." };
  }

  let shareSlug: string;

  try {
    const payload = await getPayload({ config });

    const template = await payload.findByID({
      collection: "packing-list-templates",
      id: templateId,
      overrideAccess: false,
    });

    const doc = await payload.create({
      collection: "packing-lists",
      data: {
        name: template.name,
        basedOnTemplate: template.id,
        shareSlug: nanoid(10),
        items: (template.items ?? []).map((item) => ({
          label: item.label,
          category: item.category ?? null,
          qty: item.qty ?? null,
          checked: false,
        })),
      },
      overrideAccess: false,
    });
    shareSlug = doc.shareSlug;
  } catch (err) {
    console.error(err);
    return { error: "Could not clone the template. Try again." };
  }

  redirect(`/travel/packing/${shareSlug}`);
}
