"use server";

import config from "@payload-config";
import { getPayload, type RequiredDataFromCollectionSlug } from "payload";
import { redirect } from "next/navigation";

import { formatSlug } from "@/collections/fields";

export interface CreateDiveState {
  error?: string;
}

function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function optionalText(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

type DiveCreateData = RequiredDataFromCollectionSlug<"diving">;

export async function createDiveLog(
  _prev: CreateDiveState,
  formData: FormData,
): Promise<CreateDiveState> {
  // Honeypot — bots fill hidden fields; humans leave it blank.
  if (optionalText(formData.get("company"))) {
    return {};
  }

  const title = optionalText(formData.get("title"));
  if (!title) {
    return { error: "Dive name is required." };
  }
  if (title.length > 99) {
    return { error: "Dive name must be 99 characters or fewer." };
  }

  const dateRaw = optionalText(formData.get("date"));
  const date = dateRaw ?? new Date().toISOString().slice(0, 10);

  const siteName = optionalText(formData.get("siteName"));
  const locationName = siteName ?? "Unknown";
  const buddyOrShop = optionalText(formData.get("buddyOrShop"));

  const gasRaw = optionalText(formData.get("gasType")) ?? "air";
  const gasType =
    gasRaw === "nitrox" || gasRaw === "trimix" || gasRaw === "other"
      ? gasRaw
      : "air";

  const maxDepthMeters = optionalNumber(formData.get("maxDepthMeters"));
  const bottomTimeMinutes = optionalNumber(formData.get("bottomTimeMinutes"));
  const visibilityMeters = optionalNumber(formData.get("visibilityMeters"));
  const surfaceTempC = optionalNumber(formData.get("surfaceTempC"));
  const bottomTempC = optionalNumber(formData.get("bottomTempC"));
  const weightLbs = optionalNumber(formData.get("weightLbs"));
  const startPressurePsi = optionalNumber(formData.get("startPressurePsi"));
  const endPressurePsi = optionalNumber(formData.get("endPressurePsi"));

  const skillsPracticed = optionalText(formData.get("skillsPracticed"));
  const lessonsLearned = optionalText(formData.get("lessonsLearned"));
  const environmentalNotes = optionalText(formData.get("environmentalNotes"));

  const summary = siteName ? `Dive at ${siteName}.` : "Dive log entry.";

  const data: DiveCreateData = {
    title,
    slug: formatSlug(title),
    date,
    summary,
    draft: false,
    location: { name: locationName },
    vitals: { gasType },
  };

  if (siteName) data.siteName = siteName;
  if (buddyOrShop) data.buddyOrShop = buddyOrShop;

  if (data.vitals) {
    if (maxDepthMeters != null) data.vitals.maxDepthMeters = maxDepthMeters;
    if (bottomTimeMinutes != null)
      data.vitals.bottomTimeMinutes = bottomTimeMinutes;
    if (visibilityMeters != null)
      data.vitals.visibilityMeters = visibilityMeters;
    if (surfaceTempC != null) data.vitals.surfaceTempC = surfaceTempC;
    if (bottomTempC != null) data.vitals.bottomTempC = bottomTempC;
    if (weightLbs != null) data.vitals.weightLbs = weightLbs;
    if (startPressurePsi != null)
      data.vitals.startPressurePsi = startPressurePsi;
    if (endPressurePsi != null) data.vitals.endPressurePsi = endPressurePsi;
  }

  if (skillsPracticed || lessonsLearned || environmentalNotes) {
    data.notes = {
      ...(skillsPracticed ? { skillsPracticed } : {}),
      ...(lessonsLearned ? { lessonsLearned } : {}),
      ...(environmentalNotes ? { environmentalNotes } : {}),
    };
  }

  let slug: string;
  try {
    const payload = await getPayload({ config });
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
