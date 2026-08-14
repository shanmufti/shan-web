export interface ProfileSample {
  t: number;
  d: number;
  temp?: number;
}

export interface ShearwaterParseResult {
  shearwaterId: string;
  diveNumber: number;
  product: string;
  serial: string;
  date: string;
  startTime: string;
  endTime: string;
  maxDepthMeters: number;
  bottomTimeMinutes: number;
  avgDepthMeters: number | null;
  surfaceTempC: number | null;
  bottomTempC: number | null;
  avgTempC: number | null;
  surfacePressureMbar: number | null;
  gasType: "air" | "nitrox" | "trimix" | "other";
  profileSamples: ProfileSample[];
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i] ?? "";
    const next = line[i + 1] ?? "";
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

function rowMap(headers: string[], values: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i]?.trim() ?? "";
    if (key) out[key] = (values[i] ?? "").trim();
  }
  return out;
}

function num(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Parse Shearwater "9:53:04 AM" / "10:48:06 AM" into display time + ISO date part. */
function parseShearwaterDateTime(raw: string): { date: string; time: string } {
  const trimmed = raw.trim();
  const match =
    /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M)$/i.exec(trimmed);
  if (match?.[1] && match[2]) {
    return { date: match[1], time: match[2].replace(/\s+/g, " ").trim() };
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    return {
      date: d.toISOString().slice(0, 10),
      time: d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
    };
  }
  return { date: new Date().toISOString().slice(0, 10), time: trimmed };
}

function toIsoStart(date: string, time: string): string {
  const combined = `${date} ${time}`;
  const parsed = Date.parse(combined);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return `${date}T00:00:00.000Z`;
}

function gasFromFractionO2(
  fractionO2: number | null,
): ShearwaterParseResult["gasType"] {
  if (fractionO2 == null) return "air";
  if (fractionO2 >= 0.22 && fractionO2 < 0.4) return "nitrox";
  if (fractionO2 >= 0.4) return "other";
  return "air";
}

function parseProfileRows(lines: string[]): {
  profileSamples: ProfileSample[];
  fractionO2: number | null;
} {
  const profileSamples: ProfileSample[] = [];
  let fractionO2: number | null = null;
  if (lines.length < 4 || !(lines[2] ?? "").startsWith("Time (sec)")) {
    return { profileSamples, fractionO2 };
  }

  const sampleHeaders = parseCsvLine(lines[2] ?? "");
  for (let i = 3; i < lines.length; i++) {
    const values = parseCsvLine(lines[i] ?? "");
    const row = rowMap(sampleHeaders, values);
    const t = num(row["Time (sec)"]);
    const d = num(row["Depth"]);
    if (t == null || d == null) continue;
    const temp = num(row["Water Temp"]);
    const sample: ProfileSample = { t, d };
    if (temp != null) sample.temp = temp;
    profileSamples.push(sample);
    fractionO2 ??= num(row["Fraction O2"]);
  }
  return { profileSamples, fractionO2 };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return (
    Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
  );
}

/**
 * Parse a Shearwater Cloud per-dive CSV:
 * line0 summary headers, line1 summary values,
 * line2 sample headers, line3+ samples.
 */
export function parseShearwaterDiveCsv(text: string): ShearwaterParseResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");

  if (lines.length < 2) {
    throw new Error("CSV is too short to be a Shearwater dive export.");
  }

  const summaryHeaders = parseCsvLine(lines[0] ?? "");
  const summaryValues = parseCsvLine(lines[1] ?? "");
  if (!summaryHeaders[0]?.includes("Dive Number")) {
    throw new Error(
      "Not a Shearwater dive CSV (expected Dive Number in the first header).",
    );
  }

  const summary = rowMap(summaryHeaders, summaryValues);
  const diveNumber = num(summary["Dive Number"]) ?? 0;
  const serial = summary["Computer Serial Number"] ?? "unknown";
  const product = summary["Product"] ?? "Shearwater";
  const start = parseShearwaterDateTime(summary["Start Date"] ?? "");
  const endRaw = summary["End Date"] ?? "";
  const end = endRaw
    ? parseShearwaterDateTime(endRaw)
    : { date: start.date, time: "" };

  const maxDepth = num(summary["Max Depth"]) ?? 0;
  const maxTimeSec = num(summary["Max Time"]) ?? 0;
  const bottomTimeMinutes = Math.round((maxTimeSec / 60) * 10) / 10;
  const surfacePressureMbar = num(summary["Start Surface Pressure"]);

  const { profileSamples, fractionO2 } = parseProfileRows(lines);
  const temps = profileSamples
    .map((s) => s.temp)
    .filter((t): t is number => typeof t === "number");
  const depths = profileSamples.map((s) => s.d);

  const isoStart = toIsoStart(start.date, start.time);
  const shearwaterId = `${serial}:${String(diveNumber)}:${isoStart}`;

  return {
    shearwaterId,
    diveNumber,
    product,
    serial,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    maxDepthMeters: maxDepth,
    bottomTimeMinutes,
    avgDepthMeters: average(depths),
    surfaceTempC: temps.length > 0 ? Math.max(...temps) : null,
    bottomTempC: temps.length > 0 ? Math.min(...temps) : null,
    avgTempC: average(temps),
    surfacePressureMbar,
    gasType: gasFromFractionO2(fractionO2),
    profileSamples,
  };
}
