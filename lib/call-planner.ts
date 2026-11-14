/**
 * Time zone maths for /tools/call-times, using only Intl (no libraries).
 * Pure and import-free so it runs in the browser, on the server and in
 * scripts/check-call-planner.ts.
 *
 * The week grid steps through real instants one hour at a time from local
 * midnight in the reference zone, so DST days come out right: a 23-hour day
 * has one hour with no cell, a 25-hour day keeps the first of the repeated
 * hour.
 */

export interface PlannerPerson {
  name: string;
  city?: string | null;
  timeZone: string;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface GridCell {
  /** Local hour in the reference zone, 0–23. */
  hour: number;
  /** Start of the hour, or null when DST skips this hour that day. */
  instant: number | null;
  /** Names of people awake for the whole hour. */
  awake: string[];
}

export interface GridDay {
  /** YYYY-MM-DD in the reference zone. */
  key: string;
  /** Noon UTC on that calendar date, handy for formatting the weekday. */
  labelInstant: number;
  cells: GridCell[];
  /** Hours where everyone is awake, as [startHour, endHour) runs. */
  windows: { start: number; end: number }[];
}

export interface WeekOptions {
  people: readonly PlannerPerson[];
  refZone: string;
  now: number;
  wakeStart: number;
  wakeEnd: number;
  days?: number;
}

const HOUR_MS = 60 * 60 * 1000;
const STEP_MS = 15 * 60 * 1000;

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Wall-clock date and time of an instant in a zone. */
export function zonedParts(instant: number, timeZone: string): ZonedParts {
  const out: ZonedParts = { year: 0, month: 0, day: 0, hour: 0, minute: 0 };
  for (const part of partsFormatter(timeZone).formatToParts(instant)) {
    if (part.type in out)
      out[part.type as keyof ZonedParts] = Number(part.value);
  }
  // Some engines print midnight as 24 even with h23.
  if (out.hour === 24) out.hour = 0;
  return out;
}

/** UTC offset of a zone at an instant, in minutes (e.g. -240 for EDT). */
export function offsetMinutes(instant: number, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const floored = Math.floor(instant / 60_000) * 60_000;
  return Math.round((asUtc - floored) / 60_000);
}

function dayKeyOf(p: Pick<ZonedParts, "year" | "month" | "day">): string {
  return `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** First instant of a calendar date in a zone (usually 00:00 local). */
export function zonedStartOfDay(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): number {
  const target = dayKeyOf({ year, month, day });
  const utcMidnight = Date.UTC(year, month - 1, day);
  const guess = utcMidnight - offsetMinutes(utcMidnight, timeZone) * 60_000;
  let t = utcMidnight - offsetMinutes(guess, timeZone) * 60_000;
  t = Math.floor(t / STEP_MS) * STEP_MS;
  // Nudge onto the first 15-minute step of the target date (covers DST
  // transitions at midnight).
  for (let i = 0; i < 200; i++) {
    const key = dayKeyOf(zonedParts(t, timeZone));
    if (key < target) t += STEP_MS;
    else if (dayKeyOf(zonedParts(t - STEP_MS, timeZone)) === target) {
      t -= STEP_MS;
    } else break;
  }
  return t;
}

/** Awake for the whole hour starting at `instant`, local to `timeZone`. */
export function isAwake(
  instant: number,
  timeZone: string,
  wakeStart: number,
  wakeEnd: number,
): boolean {
  const p = zonedParts(instant, timeZone);
  const start = p.hour * 60 + p.minute;
  const end = start + 60;
  const from = wakeStart * 60;
  const to = wakeEnd * 60;
  if (from < to) return start >= from && end <= to;
  // Wraps past midnight, e.g. 20:00 to 04:00.
  return start >= from || end <= to;
}

/** One day per row from today in `refZone`, 24 hourly cells each. */
export function buildWeek({
  people,
  refZone,
  now,
  wakeStart,
  wakeEnd,
  days = 7,
}: WeekOptions): GridDay[] {
  const today = zonedParts(now, refZone);
  const result: GridDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day + i));
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const start = zonedStartOfDay(y, m, d, refZone);
    const end = zonedStartOfDay(
      next.getUTCFullYear(),
      next.getUTCMonth() + 1,
      next.getUTCDate(),
      refZone,
    );
    const cells: GridCell[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      instant: null,
      awake: [],
    }));
    const ordered: GridCell[] = [];
    for (let t = start; t < end; t += HOUR_MS) {
      const cell = cells[zonedParts(t, refZone).hour];
      if (cell?.instant !== null) continue;
      cell.instant = t;
      cell.awake = people
        .filter((p) => isAwake(t, p.timeZone, wakeStart, wakeEnd))
        .map((p) => p.name);
      ordered.push(cell);
    }
    result.push({
      key: dayKeyOf({ year: y, month: m, day: d }),
      labelInstant: Date.UTC(y, m - 1, d, 12),
      cells,
      windows: people.length > 0 ? windowsOf(ordered, people.length) : [],
    });
  }
  return result;
}

function windowsOf(
  ordered: readonly GridCell[],
  total: number,
): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let open: number | null = null;
  let last = 0;
  for (const cell of ordered) {
    const all = cell.awake.length === total;
    if (all && open === null) open = cell.hour;
    if (!all && open !== null) {
      out.push({ start: open, end: last + 1 });
      open = null;
    }
    last = cell.hour;
  }
  if (open !== null) out.push({ start: open, end: last + 1 });
  return out;
}

/** "09:00" style label for a whole hour (24 shows as 24:00). */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
