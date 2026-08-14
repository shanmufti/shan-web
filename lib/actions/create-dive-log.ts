"use server";

import config from "@payload-config";
import { getPayload } from "payload";
import { redirect } from "next/navigation";

import {
  buildDiveDataFromForm,
  type DiveFormState,
} from "@/lib/actions/dive-form-data";

export type { DiveFormState as CreateDiveState };

export async function createDiveLog(
  _prev: DiveFormState,
  formData: FormData,
): Promise<DiveFormState> {
  const built = await buildDiveDataFromForm(formData);
  if ("error" in built) {
    if (built.error === "") return {};
    return { error: built.error };
  }

  const { data, csv } = built;
  let slug: string;

  try {
    const payload = await getPayload({ config });

    if (csv?.shearwaterId) {
      const existing = await payload.find({
        collection: "diving",
        where: { shearwaterId: { equals: csv.shearwaterId } },
        limit: 1,
        overrideAccess: true,
      });
      if (existing.docs[0]) {
        return {
          error: "This Shearwater dive was already imported.",
        };
      }
    }

    const slugBase = data.slug;
    let nextSlug = slugBase;
    for (let i = 0; i < 20; i++) {
      const clash = await payload.find({
        collection: "diving",
        where: { slug: { equals: nextSlug } },
        limit: 1,
        overrideAccess: true,
      });
      if (!clash.docs[0]) break;
      nextSlug = `${slugBase}-${String(i + 2)}`;
    }
    data.slug = nextSlug;

    const doc = await payload.create({
      collection: "diving",
      data,
      overrideAccess: false,
    });
    slug = doc.slug;
  } catch (err) {
    console.error(err);
    return { error: "Could not save the dive. Try again." };
  }

  redirect(`/diving/logs/${slug}`);
}
