import type { ProfileSample } from "@/lib/shearwater-csv";

function ataFromDepthMeters(depthMeters: number): number {
  return depthMeters / 10 + 1;
}

/**
 * Ambient exposure in "ATA·minutes" via trapezoidal integration of the
 * depth profile. Prefer this over avg-depth × duration when samples exist.
 */
export function integrateAtaMinutes(samples: ProfileSample[]): number | null {
  if (samples.length < 2) return null;

  const sorted = [...samples].sort((a, b) => a.t - b.t);
  let ataSeconds = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const next = sorted[i];
    if (!prev || !next) continue;
    const dt = next.t - prev.t;
    if (dt <= 0) continue;
    if (!Number.isFinite(prev.d) || !Number.isFinite(next.d)) continue;
    const ata0 = ataFromDepthMeters(Math.max(0, prev.d));
    const ata1 = ataFromDepthMeters(Math.max(0, next.d));
    ataSeconds += ((ata0 + ata1) / 2) * dt;
  }

  if (ataSeconds <= 0) return null;
  return ataSeconds / 60;
}

/**
 * Pressure-based SAC (psi/min), normalized to the surface.
 * Prefer ∫ ATA dt from the dive profile; fall back to avg depth × duration.
 */
export function calculateSacPsiPerMin(input: {
  startPsi: number;
  endPsi: number;
  bottomTimeMinutes?: number;
  avgDepthMeters?: number;
  profileSamples?: ProfileSample[];
}): number | null {
  const { startPsi, endPsi } = input;
  if (!Number.isFinite(startPsi) || !Number.isFinite(endPsi)) return null;

  const used = startPsi - endPsi;
  if (used <= 0) return null;

  const samples = input.profileSamples;
  if (samples && samples.length >= 2) {
    const ataMinutes = integrateAtaMinutes(samples);
    if (ataMinutes != null && ataMinutes > 0) {
      return Math.round((used / ataMinutes) * 10) / 10;
    }
  }

  const { bottomTimeMinutes, avgDepthMeters } = input;
  if (
    bottomTimeMinutes == null ||
    avgDepthMeters == null ||
    !Number.isFinite(bottomTimeMinutes) ||
    !Number.isFinite(avgDepthMeters)
  ) {
    return null;
  }
  if (bottomTimeMinutes <= 0 || avgDepthMeters < 0) return null;
  const ata = ataFromDepthMeters(avgDepthMeters);
  if (ata <= 0) return null;
  return Math.round((used / bottomTimeMinutes / ata) * 10) / 10;
}

export function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
