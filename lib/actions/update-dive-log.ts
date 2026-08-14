"use server";

import config from "@payload-config";
import { headers as getHeaders } from "next/headers";
import { getPayload, type RequiredDataFromCollectionSlug } from "payload";
import { redirect } from "next/navigation";

import {
  buildDiveDataFromForm,
  type DiveFormState,
} from "@/lib/actions/dive-form-data";
import type { ShearwaterParseResult } from "@/lib/shearwater-csv";
import type { Diving } from "@/payload-types";

type DiveData = RequiredDataFromCollectionSlug<"diving">;

/** Keep Shearwater id/profile when the edit form didn't upload a new CSV. */
function preserveComputerFields(
  existing: Pick<Diving, "shearwaterId" | "profileSamples">,
  data: DiveData,
  csv: ShearwaterParseResult | null,
): void {
  if (csv) return;
  if (existing.shearwaterId && !data.shearwaterId) {
    data.shearwaterId = existing.shearwaterId;
  }
  const samples = existing.profileSamples;
  if (samples != null && data.profileSamples == null) {
    data.profileSamples = samples;
  }
}

/** Merge group fields so omitted form sections don't wipe existing values. */
function mergeDiveGroups(
  existing: Pick<
    Diving,
    "vitals" | "environment" | "problems" | "gearWorn" | "notes"
  >,
  data: DiveData,
): void {
  data.vitals = { ...existing.vitals, ...data.vitals };
  if (data.environment || existing.environment) {
    data.environment = { ...existing.environment, ...data.environment };
  }
  if (data.problems || existing.problems) {
    data.problems = { ...existing.problems, ...data.problems };
  }
  if (data.gearWorn || existing.gearWorn) {
    data.gearWorn = { ...existing.gearWorn, ...data.gearWorn };
  }
  if (data.notes || existing.notes) {
    data.notes = { ...existing.notes, ...data.notes };
  }
}

async function assertUniqueShearwaterId(
  payload: Awaited<ReturnType<typeof getPayload>>,
  shearwaterId: string,
  id: number,
): Promise<string | null> {
  const clash = await payload.find({
    collection: "diving",
    where: {
      and: [
        { shearwaterId: { equals: shearwaterId } },
        { id: { not_equals: id } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });
  if (clash.docs[0]) {
    return "This Shearwater dive is already linked to another log.";
  }
  return null;
}

export async function updateDiveLog(
  _prev: DiveFormState,
  formData: FormData,
): Promise<DiveFormState> {
  const headers = await getHeaders();
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers });
  if (!user) {
    return { error: "You must be logged in to edit a dive." };
  }

  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" ? Number(idRaw) : Number.NaN;
  if (!Number.isFinite(id)) {
    return { error: "Missing dive id." };
  }

  const built = await buildDiveDataFromForm(formData);
  if ("error" in built) {
    if (built.error === "") return {};
    return { error: built.error };
  }

  const { data, csv } = built;

  let existing: Diving;
  try {
    existing = await payload.findByID({
      collection: "diving",
      id,
      user,
      overrideAccess: false,
    });
  } catch {
    return { error: "Dive not found." };
  }
  data.slug = existing.slug;

  if (csv?.shearwaterId) {
    const clashError = await assertUniqueShearwaterId(
      payload,
      csv.shearwaterId,
      id,
    );
    if (clashError) return { error: clashError };
  }

  preserveComputerFields(existing, data, csv);
  mergeDiveGroups(existing, data);

  let slug: string;
  try {
    const doc = await payload.update({
      collection: "diving",
      id,
      data,
      user,
      overrideAccess: false,
    });
    slug = doc.slug;
  } catch (err) {
    console.error(err);
    return { error: "Could not update the dive. Try again." };
  }

  redirect(`/diving/logs/${slug}`);
}
