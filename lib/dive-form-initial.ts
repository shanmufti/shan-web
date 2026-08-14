import type { DiveFormValues } from "@/components/log-dive-form";
import type { DiveDoc } from "@/lib/content";
import { parseProfileSamples } from "@/lib/dive-profile";

function dateInputValue(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${String(y)}-${m}-${d}`;
}

export function diveToFormValues(dive: DiveDoc): DiveFormValues {
  const vitals = dive.vitals;
  const env = dive.environment;
  const problems = dive.problems;
  const gear = dive.gearWorn;
  const notes = dive.notes;
  const samples = parseProfileSamples(dive.profileSamples);

  return {
    id: dive.id,
    title: dive.title,
    date: dateInputValue(dive.date),
    startTime: dive.startTime ?? null,
    endTime: dive.endTime ?? null,
    diveNumber: dive.diveNumber ?? null,
    siteName: dive.siteName ?? null,
    siteDetail: dive.siteDetail ?? null,
    buddyOrShop: dive.buddyOrShop ?? null,
    maxDepthMeters: vitals?.maxDepthMeters ?? null,
    avgDepthMeters: vitals?.avgDepthMeters ?? null,
    bottomTimeMinutes: vitals?.bottomTimeMinutes ?? null,
    visibilityMeters: vitals?.visibilityMeters ?? null,
    surfaceTempC: vitals?.surfaceTempC ?? null,
    bottomTempC: vitals?.bottomTempC ?? null,
    avgTempC: vitals?.avgTempC ?? null,
    weightLbs: vitals?.weightLbs ?? null,
    gasType: vitals?.gasType ?? "air",
    startPressurePsi: vitals?.startPressurePsi ?? null,
    endPressurePsi: vitals?.endPressurePsi ?? null,
    sac: vitals?.sac ?? null,
    airTempC: env?.airTempC ?? null,
    weather: env?.weather ?? null,
    platform: env?.platform ?? null,
    environmentType: env?.environmentType ?? null,
    conditions: env?.conditions ?? null,
    environmentNotes: env?.notes ?? null,
    thermalComfort: problems?.thermalComfort ?? null,
    equipmentMalfunction: problems?.equipmentMalfunction ?? null,
    equipmentMalfunctionNotes: problems?.equipmentMalfunctionNotes ?? null,
    workload: problems?.workload ?? null,
    anySymptoms: problems?.anySymptoms ?? null,
    problemsText: problems?.problems ?? null,
    exposureToAltitude: problems?.exposureToAltitude ?? null,
    problemsNotes: problems?.notes ?? null,
    postDiveCheckup: problems?.postDiveCheckup ?? null,
    dress: gear?.dress ?? null,
    apparatus: gear?.apparatus ?? null,
    tankSize: gear?.tankSize ?? null,
    gearNotes: gear?.notes ?? null,
    diveNotes: notes?.diveNotes ?? null,
    skillsPracticed: notes?.skillsPracticed ?? null,
    lessonsLearned: notes?.lessonsLearned ?? null,
    hasProfile: samples.length > 0,
    profileSamples: samples,
  };
}
