/** Unix timestamps and time zones, using only the built-in Intl APIs. */

export type TimeUnit = "s" | "ms" | "us" | "ns";

export type ParsedTime =
  { ok: true; ms: number; detected: string } | { ok: false; error: string };

const UNIT_LABEL: Record<TimeUnit, string> = {
  s: "seconds",
  ms: "milliseconds",
  us: "microseconds",
  ns: "nanoseconds",
};

const UNIT_TO_MS: Record<TimeUnit, number> = {
  s: 1000,
  ms: 1,
  us: 1e-3,
  ns: 1e-6,
};

/** Guess the unit from the size of the number (as most converters do). */
export function guessUnit(value: number): TimeUnit {
  const abs = Math.abs(value);
  if (abs >= 1e17) return "ns";
  if (abs >= 1e14) return "us";
  if (abs >= 1e11) return "ms";
  return "s";
}

// Max Date range: ±8.64e15 ms.
const MAX_MS = 8.64e15;

export function parseTimeInput(
  text: string,
  unit: TimeUnit | "auto" = "auto",
): ParsedTime {
  const input = text.trim();
  if (input === "") return { ok: false, error: "Enter a timestamp or a date." };
  if (/^-?\d+(\.\d+)?$/.test(input)) {
    const value = Number(input);
    const u = unit === "auto" ? guessUnit(value) : unit;
    const ms = value * UNIT_TO_MS[u];
    if (!Number.isFinite(ms) || Math.abs(ms) > MAX_MS) {
      return {
        ok: false,
        error: "That number is outside the supported date range.",
      };
    }
    return {
      ok: true,
      ms: Math.trunc(ms),
      detected: `Unix time in ${UNIT_LABEL[u]}${unit === "auto" ? " (detected)" : ""}`,
    };
  }
  const ms = Date.parse(input);
  if (Number.isNaN(ms)) {
    return {
      ok: false,
      error:
        "Not a number or a date this browser can read. Try 1700000000 or 2026-11-14T09:30:00Z.",
    };
  }
  const hasZone = /(z|[+-]\d{2}:?\d{2})$/i.test(input);
  return {
    ok: true,
    ms,
    detected: hasZone ? "Date with offset" : "Date in your local time zone",
  };
}

export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function allTimeZones(): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes("UTC") ? zones : ["UTC", ...zones];
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallTimeIn(ms: number, zone: string): WallTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(ms));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of `zone` from UTC at instant `ms`, in minutes (east positive). */
export function zoneOffsetMinutes(ms: number, zone: string): number {
  const w = wallTimeIn(ms, zone);
  const asUtc = Date.UTC(
    w.year,
    w.month - 1,
    w.day,
    w.hour,
    w.minute,
    w.second,
  );
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${h}:${m}`;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** "2026-11-14 09:30:00" in the zone, plus its offset. */
export function formatInZone(ms: number, zone: string): string {
  const w = wallTimeIn(ms, zone);
  return `${pad(w.year, 4)}-${pad(w.month)}-${pad(w.day)} ${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)} (${formatOffset(zoneOffsetMinutes(ms, zone))})`;
}

/** Long, human form in the zone, e.g. "Saturday, 14 November 2026 at 09:30:00 GMT-5". */
export function formatLongInZone(ms: number, zone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: zone,
    dateStyle: "full",
    timeStyle: "long",
  }).format(new Date(ms));
}

/**
 * The instant at which the clock in `zone` shows the given wall time.
 * For times skipped by a DST jump, returns the instant just after the jump.
 */
export function zonedTimeToMs(wall: WallTime, zone: string): number {
  const guess = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
  );
  let ms = guess - zoneOffsetMinutes(guess, zone) * 60000;
  // A second pass settles cases near an offset change.
  ms = guess - zoneOffsetMinutes(ms, zone) * 60000;
  return ms;
}

/** Parses "YYYY-MM-DDTHH:mm[:ss]" from <input type="datetime-local">. */
export function parseWallTime(value: string): WallTime | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(
    value,
  );
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  return {
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: Number(h),
    minute: Number(mi),
    second: Number(s ?? "0"),
  };
}

export function toDateTimeLocalValue(ms: number, zone: string): string {
  const w = wallTimeIn(ms, zone);
  return `${pad(w.year, 4)}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}`;
}

export function relativeTime(ms: number, nowMs = Date.now()): string {
  const diff = ms - nowMs;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365.25 * 24 * 3600e3],
    ["month", 30.44 * 24 * 3600e3],
    ["day", 24 * 3600e3],
    ["hour", 3600e3],
    ["minute", 60e3],
    ["second", 1e3],
  ];
  for (const [unit, size] of units) {
    if (abs >= size || unit === "second") {
      return rtf.format(Math.round(diff / size), unit);
    }
  }
  return "now";
}
