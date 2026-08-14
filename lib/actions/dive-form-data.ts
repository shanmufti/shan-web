import type { RequiredDataFromCollectionSlug } from "payload";

import {
  parseShearwaterDiveCsv,
  type ShearwaterParseResult,
} from "@/lib/shearwater-csv";
import { formatSlug } from "@/lib/slug";

export interface DiveFormState {
  error?: string;
}

type DiveData = RequiredDataFromCollectionSlug<"diving">;

type GasType = "air" | "nitrox" | "trimix" | "other";

interface DiveVitals {
  gasType: GasType;
  maxDepthMeters?: number;
  avgDepthMeters?: number;
  bottomTimeMinutes?: number;
  visibilityMeters?: number;
  surfaceTempC?: number;
  bottomTempC?: number;
  avgTempC?: number;
  weightLbs?: number;
  startPressurePsi?: number;
  endPressurePsi?: number;
  sac?: number;
}

interface DiveEnvironment {
  airTempC?: number;
  weather?: "clear" | "cloudy" | "rain" | "wind" | "other";
  platform?: "shore" | "boat" | "other";
  environmentType?: "ocean" | "lake" | "quarry" | "other";
  conditions?: "calm" | "current" | "surge" | "other";
  notes?: string;
}

interface DiveProblems {
  thermalComfort?: "cold" | "cool" | "comfortable" | "warm" | "hot";
  equipmentMalfunction?: "none" | "minor" | "yes";
  equipmentMalfunctionNotes?: string;
  workload?: "light" | "moderate" | "heavy";
  anySymptoms?: string;
  problems?: string;
  exposureToAltitude?: "no" | "yes";
  notes?: string;
  postDiveCheckup?: string;
}

interface DiveGearWorn {
  dress?: "dry-suit" | "wet-suit" | "other";
  apparatus?: "single-tank" | "doubles" | "other";
  tankSize?: "AL80" | "HP100" | "HP80";
  notes?: string;
}

interface DiveNotes {
  diveNotes?: string;
  skillsPracticed?: string;
  lessonsLearned?: string;
}

export function optionalNumber(
  value: FormDataEntryValue | null,
): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function optionalText(
  value: FormDataEntryValue | null,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

async function readCsvFromForm(
  formData: FormData,
): Promise<ShearwaterParseResult | null> {
  const file = formData.get("shearwaterCsv");
  if (!(file instanceof File) || file.size === 0) return null;
  const text = await file.text();
  return parseShearwaterDiveCsv(text);
}

function applySelect<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

function resolveTitle(
  formData: FormData,
  csv: ShearwaterParseResult | null,
): { ok: true; title: string } | { ok: false; error: string } {
  const title =
    optionalText(formData.get("title")) ??
    (csv
      ? `${csv.date} - Dive #${String(csv.diveNumber)} (${csv.product})`
      : undefined);
  if (!title) return { ok: false, error: "Dive name is required." };
  if (title.length > 99) {
    return { ok: false, error: "Dive name must be 99 characters or fewer." };
  }
  return { ok: true, title };
}

function resolveGasType(
  formData: FormData,
  csv: ShearwaterParseResult | null,
): GasType {
  const gasRaw = optionalText(formData.get("gasType")) ?? csv?.gasType ?? "air";
  if (gasRaw === "nitrox" || gasRaw === "trimix" || gasRaw === "other") {
    return gasRaw;
  }
  return "air";
}

function applyVitals(
  formData: FormData,
  csv: ShearwaterParseResult | null,
  gasType: GasType,
): DiveVitals {
  const vitals: DiveVitals = { gasType };
  const maxDepthMeters =
    optionalNumber(formData.get("maxDepthMeters")) ?? csv?.maxDepthMeters;
  const avgDepthMeters =
    optionalNumber(formData.get("avgDepthMeters")) ?? csv?.avgDepthMeters;
  const bottomTimeMinutes =
    optionalNumber(formData.get("bottomTimeMinutes")) ?? csv?.bottomTimeMinutes;
  const visibilityMeters = optionalNumber(formData.get("visibilityMeters"));
  const surfaceTempC =
    optionalNumber(formData.get("surfaceTempC")) ?? csv?.surfaceTempC;
  const bottomTempC =
    optionalNumber(formData.get("bottomTempC")) ?? csv?.bottomTempC;
  const avgTempC = optionalNumber(formData.get("avgTempC")) ?? csv?.avgTempC;
  const weightLbs = optionalNumber(formData.get("weightLbs"));
  const startPressurePsi = optionalNumber(formData.get("startPressurePsi"));
  const endPressurePsi = optionalNumber(formData.get("endPressurePsi"));
  const sac = optionalNumber(formData.get("sac"));

  if (maxDepthMeters != null) vitals.maxDepthMeters = maxDepthMeters;
  if (avgDepthMeters != null) vitals.avgDepthMeters = avgDepthMeters;
  if (bottomTimeMinutes != null) vitals.bottomTimeMinutes = bottomTimeMinutes;
  if (visibilityMeters != null) vitals.visibilityMeters = visibilityMeters;
  if (surfaceTempC != null) vitals.surfaceTempC = surfaceTempC;
  if (bottomTempC != null) vitals.bottomTempC = bottomTempC;
  if (avgTempC != null) vitals.avgTempC = avgTempC;
  if (weightLbs != null) vitals.weightLbs = weightLbs;
  if (startPressurePsi != null) vitals.startPressurePsi = startPressurePsi;
  if (endPressurePsi != null) vitals.endPressurePsi = endPressurePsi;
  if (sac != null) vitals.sac = sac;
  return vitals;
}

function applyEnvironment(formData: FormData): DiveEnvironment | undefined {
  const airTempC = optionalNumber(formData.get("airTempC"));
  const weather = applySelect(optionalText(formData.get("weather")), [
    "clear",
    "cloudy",
    "rain",
    "wind",
    "other",
  ] as const);
  const platform = applySelect(optionalText(formData.get("platform")), [
    "shore",
    "boat",
    "other",
  ] as const);
  const environmentType = applySelect(
    optionalText(formData.get("environmentType")),
    ["ocean", "lake", "quarry", "other"] as const,
  );
  const conditions = applySelect(optionalText(formData.get("conditions")), [
    "calm",
    "current",
    "surge",
    "other",
  ] as const);
  const environmentNotes = optionalText(formData.get("environmentNotes"));

  if (
    airTempC == null &&
    !weather &&
    !platform &&
    !environmentType &&
    !conditions &&
    !environmentNotes
  ) {
    return undefined;
  }

  const environment: DiveEnvironment = {};
  if (airTempC != null) environment.airTempC = airTempC;
  if (weather) environment.weather = weather;
  if (platform) environment.platform = platform;
  if (environmentType) environment.environmentType = environmentType;
  if (conditions) environment.conditions = conditions;
  if (environmentNotes) environment.notes = environmentNotes;
  return environment;
}

function applyProblems(
  formData: FormData,
): DiveProblems | { error: string } | undefined {
  const thermalComfort = applySelect(
    optionalText(formData.get("thermalComfort")),
    ["cold", "cool", "comfortable", "warm", "hot"] as const,
  );
  const equipmentMalfunction = applySelect(
    optionalText(formData.get("equipmentMalfunction")),
    ["none", "minor", "yes"] as const,
  );
  const equipmentMalfunctionNotes = optionalText(
    formData.get("equipmentMalfunctionNotes"),
  );
  if (
    (equipmentMalfunction === "minor" || equipmentMalfunction === "yes") &&
    !equipmentMalfunctionNotes
  ) {
    return {
      error: "Describe the equipment malfunction in the notes field.",
    };
  }
  const workload = applySelect(optionalText(formData.get("workload")), [
    "light",
    "moderate",
    "heavy",
  ] as const);
  const anySymptoms = optionalText(formData.get("anySymptoms"));
  const problemsText = optionalText(formData.get("problemsText"));
  const exposureToAltitude = applySelect(
    optionalText(formData.get("exposureToAltitude")),
    ["no", "yes"] as const,
  );
  const problemsNotes = optionalText(formData.get("problemsNotes"));
  const postDiveCheckup = optionalText(formData.get("postDiveCheckup"));

  if (
    !thermalComfort &&
    !equipmentMalfunction &&
    !equipmentMalfunctionNotes &&
    !workload &&
    !anySymptoms &&
    !problemsText &&
    !exposureToAltitude &&
    !problemsNotes &&
    !postDiveCheckup
  ) {
    return undefined;
  }

  const problems: DiveProblems = {};
  if (thermalComfort) problems.thermalComfort = thermalComfort;
  if (equipmentMalfunction)
    problems.equipmentMalfunction = equipmentMalfunction;
  if (equipmentMalfunctionNotes) {
    problems.equipmentMalfunctionNotes = equipmentMalfunctionNotes;
  }
  if (workload) problems.workload = workload;
  if (anySymptoms) problems.anySymptoms = anySymptoms;
  if (problemsText) problems.problems = problemsText;
  if (exposureToAltitude) problems.exposureToAltitude = exposureToAltitude;
  if (problemsNotes) problems.notes = problemsNotes;
  if (postDiveCheckup) problems.postDiveCheckup = postDiveCheckup;
  return problems;
}

function applyGearWorn(formData: FormData): DiveGearWorn | undefined {
  const dress = applySelect(optionalText(formData.get("dress")), [
    "dry-suit",
    "wet-suit",
    "other",
  ] as const);
  const apparatus = applySelect(optionalText(formData.get("apparatus")), [
    "single-tank",
    "doubles",
    "other",
  ] as const);
  const tankSize = applySelect(optionalText(formData.get("tankSize")), [
    "AL80",
    "HP100",
    "HP80",
  ] as const);
  const gearNotes = optionalText(formData.get("gearNotes"));

  if (!dress && !apparatus && !tankSize && !gearNotes) return undefined;

  const gear: DiveGearWorn = {};
  if (dress) gear.dress = dress;
  if (apparatus) gear.apparatus = apparatus;
  if (tankSize) gear.tankSize = tankSize;
  if (gearNotes) gear.notes = gearNotes;
  return gear;
}

function applyNotes(formData: FormData): DiveNotes | undefined {
  const diveNotes = optionalText(formData.get("diveNotes"));
  const skillsPracticed = optionalText(formData.get("skillsPracticed"));
  const lessonsLearned = optionalText(formData.get("lessonsLearned"));

  if (!diveNotes && !skillsPracticed && !lessonsLearned) return undefined;

  const notes: DiveNotes = {};
  if (diveNotes) notes.diveNotes = diveNotes;
  if (skillsPracticed) notes.skillsPracticed = skillsPracticed;
  if (lessonsLearned) notes.lessonsLearned = lessonsLearned;
  return notes;
}

function applyCoreMeta(
  data: DiveData,
  formData: FormData,
  csv: ShearwaterParseResult | null,
) {
  const siteName = optionalText(formData.get("siteName"));
  const siteDetail = optionalText(formData.get("siteDetail"));
  const buddyOrShop = optionalText(formData.get("buddyOrShop"));
  const startTime = optionalText(formData.get("startTime")) ?? csv?.startTime;
  const endTime = optionalText(formData.get("endTime")) ?? csv?.endTime;
  const diveNumber =
    optionalNumber(formData.get("diveNumber")) ?? csv?.diveNumber;

  data.summary = siteName ? `Dive at ${siteName}.` : "Dive log entry.";
  data.location = { name: siteName ?? "Unknown" };
  if (siteName) data.siteName = siteName;
  if (siteDetail) data.siteDetail = siteDetail;
  if (buddyOrShop) data.buddyOrShop = buddyOrShop;
  if (startTime) data.startTime = startTime;
  if (endTime) data.endTime = endTime;
  if (diveNumber != null) data.diveNumber = diveNumber;
  if (csv?.shearwaterId) data.shearwaterId = csv.shearwaterId;
}

/** Build Payload dive data from form (+ optional CSV). Form overrides CSV when both set. */
export async function buildDiveDataFromForm(
  formData: FormData,
): Promise<
  { data: DiveData; csv: ShearwaterParseResult | null } | { error: string }
> {
  if (optionalText(formData.get("company"))) {
    return { error: "" };
  }

  let csv: ShearwaterParseResult | null = null;
  try {
    csv = await readCsvFromForm(formData);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not parse Shearwater CSV.";
    return { error: message };
  }

  const titleResult = resolveTitle(formData, csv);
  if (!titleResult.ok) return { error: titleResult.error };
  const { title } = titleResult;

  const date =
    optionalText(formData.get("date")) ??
    csv?.date ??
    new Date().toISOString().slice(0, 10);

  const data: DiveData = {
    title,
    slug: formatSlug(title),
    date,
    summary: "Dive log entry.",
    draft: false,
    location: { name: "Unknown" },
    vitals: applyVitals(formData, csv, resolveGasType(formData, csv)),
  };

  applyCoreMeta(data, formData, csv);

  const environment = applyEnvironment(formData);
  if (environment) data.environment = environment;

  const problems = applyProblems(formData);
  if (problems && "error" in problems) return problems;
  if (problems) data.problems = problems;

  const gearWorn = applyGearWorn(formData);
  if (gearWorn) data.gearWorn = gearWorn;

  const notes = applyNotes(formData);
  if (notes) data.notes = notes;

  if (csv && csv.profileSamples.length > 0) {
    data.profileSamples = csv.profileSamples;
  }

  return { data, csv };
}
