/**
 * Standard 5-field cron (Vixie/POSIX style): parse, explain, next run times.
 * minute hour day-of-month month day-of-week, plus @hourly-style macros.
 */

interface FieldSpec {
  name: string;
  min: number;
  max: number;
  names?: string[];
}

const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const FIELDS: FieldSpec[] = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12, names: MONTH_NAMES },
  { name: "day of week", min: 0, max: 7, names: DAY_NAMES },
];

const MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

interface Part {
  start: number;
  end: number;
  step: number;
  /** Written as `*` or `*\/n`. */
  star: boolean;
}

export interface CronField {
  text: string;
  parts: Part[];
  values: number[];
  /** Field starts with `*` (matters for the day-of-month/day-of-week rule). */
  star: boolean;
}

export interface CronSchedule {
  expression: string;
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

export type CronParse =
  { ok: true; schedule: CronSchedule } | { ok: false; error: string };

class CronError extends Error {}

function parseValue(raw: string, spec: FieldSpec): number {
  const upper = raw.toUpperCase();
  const named = spec.names?.indexOf(upper) ?? -1;
  if (named >= 0) return spec.names === MONTH_NAMES ? named + 1 : named;
  if (!/^\d+$/.test(raw)) {
    throw new CronError(`"${raw}" is not a valid ${spec.name} value.`);
  }
  const value = Number(raw);
  if (value < spec.min || value > spec.max) {
    throw new CronError(
      `${spec.name} ${raw} is out of range (${String(spec.min)}-${String(spec.max)}).`,
    );
  }
  return value;
}

function parsePart(raw: string, spec: FieldSpec): Part {
  if (raw === "") throw new CronError(`Empty item in the ${spec.name} field.`);
  const [range = "", stepText, extra] = raw.split("/");
  if (extra !== undefined) throw new CronError(`Too many "/" in "${raw}".`);
  let step = 1;
  if (stepText !== undefined) {
    if (!/^\d+$/.test(stepText) || Number(stepText) === 0) {
      throw new CronError(
        `Step "${stepText}" in the ${spec.name} field must be a positive number.`,
      );
    }
    step = Number(stepText);
  }
  if (range === "*" || range === "?") {
    return {
      start: spec.min,
      end: spec.name === "day of week" ? 6 : spec.max,
      step,
      star: true,
    };
  }
  const [a = "", b, more] = range.split("-");
  if (more !== undefined) throw new CronError(`Bad range "${range}".`);
  const start = parseValue(a, spec);
  // "5/15" means "from 5 to the end, every 15".
  let end = start;
  if (b !== undefined) end = parseValue(b, spec);
  else if (stepText !== undefined) end = spec.max;
  if (end < start) {
    throw new CronError(
      `Range "${range}" in the ${spec.name} field runs backwards.`,
    );
  }
  return { start, end, step, star: false };
}

function parseField(text: string, spec: FieldSpec): CronField {
  if (
    /[LW#]/i.test(text) &&
    !spec.names?.some((n) => text.toUpperCase().includes(n))
  ) {
    throw new CronError(
      `"${text}" uses Quartz-only syntax (L, W or #), which standard cron doesn't support.`,
    );
  }
  const parts = text.split(",").map((p) => parsePart(p, spec));
  const set = new Set<number>();
  for (const part of parts) {
    for (let v = part.start; v <= part.end; v += part.step) {
      set.add(spec.name === "day of week" && v === 7 ? 0 : v);
    }
  }
  return {
    text,
    parts,
    values: [...set].sort((x, y) => x - y),
    star: text.startsWith("*") || text.startsWith("?"),
  };
}

export function parseCron(expression: string): CronParse {
  const trimmed = expression.trim().replaceAll(/\s+/g, " ");
  if (trimmed === "") return { ok: false, error: "Enter a cron expression." };
  const lower = trimmed.toLowerCase();
  if (lower === "@reboot") {
    return {
      ok: false,
      error: "@reboot runs once at startup, so it has no schedule to explain.",
    };
  }
  const source = MACROS[lower] ?? trimmed;
  const fields = source.split(" ");
  if (fields.length === 6) {
    return {
      ok: false,
      error:
        "6 fields found. Standard cron has 5 (minute hour day month weekday); a seconds or year field is a Quartz/Spring extension.",
    };
  }
  if (fields.length !== 5) {
    return {
      ok: false,
      error: `Expected 5 fields (minute hour day month weekday), found ${String(fields.length)}.`,
    };
  }
  try {
    const [minute, hour, dayOfMonth, month, dayOfWeek] = FIELDS.map((spec, i) =>
      parseField(fields[i] ?? "", spec),
    ) as [CronField, CronField, CronField, CronField, CronField];
    return {
      ok: true,
      schedule: {
        expression: trimmed,
        minute,
        hour,
        dayOfMonth,
        month,
        dayOfWeek,
      },
    };
  } catch (error) {
    if (error instanceof CronError) return { ok: false, error: error.message };
    throw error;
  }
}

// ---------- Explanation ----------

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1) ?? ""}`;
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${String(n)}${s[(v - 20) % 10] ?? s[v] ?? s[0] ?? "th"}`;
};

const two = (n: number) => String(n).padStart(2, "0");

function describeParts(
  field: CronField,
  unit: string,
  label: (n: number) => string,
): string {
  const pieces = field.parts.map((p) => {
    if (p.star && p.step > 1) return `every ${String(p.step)} ${unit}s`;
    if (p.star) return `every ${unit}`;
    if (p.start === p.end) return label(p.start);
    const span = `${label(p.start)} through ${label(p.end)}`;
    return p.step > 1 ? `every ${String(p.step)} ${unit}s from ${span}` : span;
  });
  return joinList(pieces);
}

const singleValues = (field: CronField) =>
  field.parts.every((p) => !p.star && p.start === p.end);

/** Plain `*` (every value, no step). */
const isEvery = (field: CronField) =>
  field.star && field.parts.length === 1 && field.parts[0]?.step === 1;

function describeMinutes(minute: CronField): string {
  if (isEvery(minute)) return "Every minute";
  if (singleValues(minute)) {
    return `At minute ${joinList(minute.values.map(String))}`;
  }
  const text = describeParts(minute, "minute", (n) => `minute ${String(n)}`);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function describeTime(s: CronSchedule): string {
  const { minute, hour } = s;
  if (singleValues(minute) && singleValues(hour)) {
    const times: string[] = [];
    for (const h of hour.values) {
      for (const m of minute.values) times.push(`${two(h)}:${two(m)}`);
    }
    if (times.length <= 12) return `At ${joinList(times)}`;
  }
  const minuteText = describeMinutes(minute);
  if (isEvery(hour)) {
    return isEvery(minute) ? minuteText : `${minuteText} past every hour`;
  }
  const hourText = describeParts(hour, "hour", (n) => `${two(n)}:00`);
  const hourPhrase = hourText.startsWith("every")
    ? hourText
    : `during ${hourText}`;
  return `${minuteText}, ${hourPhrase}`;
}

function describeDays(s: CronSchedule): string {
  const domAll =
    s.dayOfMonth.star && s.dayOfMonth.parts.every((p) => p.step === 1);
  const dowAll =
    s.dayOfWeek.star && s.dayOfWeek.parts.every((p) => p.step === 1);
  const dom = `on day-of-month ${describeParts(s.dayOfMonth, "day", (n) => ordinal(n))}`;
  const dow = `on ${describeParts(s.dayOfWeek, "day", (n) => DAY_LONG[n % 7] ?? "")}`;
  if (domAll && dowAll) return "";
  if (dowAll) return dom;
  if (domAll) return dow;
  if (!s.dayOfMonth.star && !s.dayOfWeek.star) return `${dom}, or ${dow}`;
  return `${dom}, ${dow}`;
}

function describeMonths(s: CronSchedule): string {
  if (s.month.star && s.month.parts.every((p) => p.step === 1)) return "";
  return `in ${describeParts(s.month, "month", (n) => MONTH_LONG[n - 1] ?? "")}`;
}

export function explainCron(s: CronSchedule): string {
  const pieces = [describeTime(s), describeDays(s), describeMonths(s)].filter(
    Boolean,
  );
  return `${pieces.join(", ")}.`;
}

// ---------- Next runs ----------

export type CronZone = "local" | "utc";

interface DayParts {
  y: number;
  mo: number;
  d: number;
}

/** Date arithmetic in either the browser's zone or UTC. */
interface Calendar {
  parts: (date: Date) => DayParts & { dow: number; h: number };
  make: (day: DayParts, h?: number, mi?: number) => Date;
}

const CALENDARS: Record<CronZone, Calendar> = {
  local: {
    parts: (t) => ({
      y: t.getFullYear(),
      mo: t.getMonth(),
      d: t.getDate(),
      dow: t.getDay(),
      h: t.getHours(),
    }),
    make: ({ y, mo, d }, h = 0, mi = 0) => new Date(y, mo, d, h, mi),
  },
  utc: {
    parts: (t) => ({
      y: t.getUTCFullYear(),
      mo: t.getUTCMonth(),
      d: t.getUTCDate(),
      dow: t.getUTCDay(),
      h: t.getUTCHours(),
    }),
    make: ({ y, mo, d }, h = 0, mi = 0) => new Date(Date.UTC(y, mo, d, h, mi)),
  },
};

function dayMatches(s: CronSchedule, dom: number, dow: number): boolean {
  const domOk = s.dayOfMonth.values.includes(dom);
  const dowOk = s.dayOfWeek.values.includes(dow);
  // Vixie cron: if either field is unrestricted (`*`), both must match;
  // if both are restricted, either may match.
  if (s.dayOfMonth.star || s.dayOfWeek.star) return domOk && dowOk;
  return domOk || dowOk;
}

/** Run times on one matching day, after `start`, in order. */
function runsOnDay(
  s: CronSchedule,
  day: DayParts,
  cal: Calendar,
  start: number,
): Date[] {
  const out: Date[] = [];
  for (const h of s.hour.values) {
    for (const mi of s.minute.values) {
      const run = cal.make(day, h, mi);
      // Local times skipped by a DST jump land on another hour: skip them.
      if (run.getTime() > start && cal.parts(run).h === h) out.push(run);
    }
  }
  return out;
}

/** Next `count` run times strictly after `from`. Searches up to ~8 years. */
export function nextRuns(
  s: CronSchedule,
  count = 5,
  from: Date = new Date(),
  zone: CronZone = "local",
): Date[] {
  const cal = CALENDARS[zone];
  const results: Date[] = [];
  const seen = new Set<number>();
  let day = cal.parts(from);
  for (let i = 0; i < 366 * 8 && results.length < count; i++) {
    if (s.month.values.includes(day.mo + 1) && dayMatches(s, day.d, day.dow)) {
      for (const run of runsOnDay(s, day, cal, from.getTime())) {
        if (!seen.has(run.getTime())) {
          seen.add(run.getTime());
          results.push(run);
        }
      }
    }
    day = cal.parts(cal.make({ ...day, d: day.d + 1 }));
  }
  return results.slice(0, count);
}
