import type { ProfileSample } from "@/lib/shearwater-csv";

export function parseProfileSamples(value: unknown): ProfileSample[] {
  if (!Array.isArray(value)) return [];
  const samples: ProfileSample[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const t = Number(record["t"]);
    const d = Number(record["d"]);
    if (!Number.isFinite(t) || !Number.isFinite(d)) continue;
    const sample: ProfileSample = { t, d };
    const temp = Number(record["temp"]);
    if (Number.isFinite(temp)) sample.temp = temp;
    samples.push(sample);
  }
  return samples;
}
