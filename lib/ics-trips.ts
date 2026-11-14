/**
 * Pure helpers for scripts/ics-trip-dates.ts: read an exported calendar
 * (.ics) and suggest visit date ranges per destination by matching event
 * titles and locations against destination names. No file system or Payload
 * access here.
 */

export interface CalendarEvent {
  summary: string;
  location: string;
  /** Inclusive start day, YYYY-MM-DD. */
  start: string;
  /** Inclusive end day, YYYY-MM-DD. */
  end: string;
}

/** Undo RFC 5545 line folding (CRLF + space/tab continues a line). */
function unfold(text: string): string[] {
  return text.replaceAll(/\r?\n[ \t]/g, "").split(/\r?\n/);
}

function unescapeText(value: string): string {
  return value
    .replaceAll(/\\n/gi, " ")
    .replaceAll(/\\([,;\\])/g, "$1")
    .trim();
}

/** YYYY-MM-DD from 20240517 or 20240517T090000Z. */
function day(value: string): string | null {
  const digits = value.trim().slice(0, 8);
  if (!/^\d{8}$/.test(digits)) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

type Props = Record<string, { params: string; value: string } | undefined>;

/** One VEVENT's properties as a calendar event, or null without a start. */
function toEvent(props: Props): CalendarEvent | null {
  const start = props["DTSTART"];
  const startDay = start ? day(start.value) : null;
  if (!start || !startDay) return null;
  const endProp = props["DTEND"];
  let endDay = endProp ? day(endProp.value) : null;
  // All-day DTEND is exclusive: a stay on the 17th to 22nd ends 20240723
  // in the file. Timed events keep their end day.
  const allDay = /VALUE=DATE(?:;|$)/.test(start.params);
  if (endDay && allDay && endDay > startDay) endDay = addDays(endDay, -1);
  return {
    summary: unescapeText(props["SUMMARY"]?.value ?? ""),
    location: unescapeText(props["LOCATION"]?.value ?? ""),
    start: startDay,
    end: endDay && endDay >= startDay ? endDay : startDay,
  };
}

function readProperty(line: string, props: Props) {
  const colon = line.indexOf(":");
  if (colon < 0) return;
  const [name = "", ...params] = line.slice(0, colon).split(";");
  props[name.toUpperCase()] = {
    params: params.join(";"),
    value: line.slice(colon + 1),
  };
}

export function parseIcs(text: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  let current: Props | null = null;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") {
      current = {};
    } else if (line === "END:VEVENT") {
      const event = current ? toEvent(current) : null;
      if (event) events.push(event);
      current = null;
    } else if (current) {
      readProperty(line, current);
    }
  }
  return events;
}

/** Bookings and logistics, not stays. */
const LOGISTICS =
  /\b(flight|fly|bus|ferry|shuttle|train|transfer|check[- ]?in|check[- ]?out|airbnb|booking|hotel|hostel|uber|taxi)\b/i;

export function isLogistics(event: CalendarEvent): boolean {
  return LOGISTICS.test(event.summary);
}

function normalise(value: string): string {
  return ` ${value
    .normalize("NFKD")
    .replaceAll(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

export interface DestinationName {
  slug: string;
  /** Title plus any aliases (e.g. "CDMX" for Mexico City). */
  names: string[];
}

export interface DateRange {
  from: string;
  to: string;
  /** Event titles that produced this range. */
  events: string[];
}

export interface TripSuggestion {
  slug: string;
  ranges: DateRange[];
}

/** Merge ranges that overlap or touch (next day). */
export function mergeRanges(ranges: DateRange[]): DateRange[] {
  const sorted = [...ranges].sort((a, b) => a.from.localeCompare(b.from));
  const out: DateRange[] = [];
  for (const range of sorted) {
    const last = out.at(-1);
    if (last && range.from <= addDays(last.to, 1)) {
      if (range.to > last.to) last.to = range.to;
      for (const e of range.events) {
        if (!last.events.includes(e)) last.events.push(e);
      }
    } else {
      out.push({ ...range, events: [...range.events] });
    }
  }
  return out;
}

/**
 * Date ranges per destination: an event matches when a destination name
 * appears as whole words in its title or location. Logistics events
 * (flights, buses, hotel bookings) are ignored. Events that match nothing
 * come back in `unmatched` so trips without a Maps list still show up.
 */
export function suggestTripDates(
  events: CalendarEvent[],
  destinations: DestinationName[],
): { suggestions: TripSuggestion[]; unmatched: CalendarEvent[] } {
  const byDest = new Map<string, DateRange[]>();
  const unmatched: CalendarEvent[] = [];
  for (const event of events) {
    if (isLogistics(event)) continue;
    const haystack = normalise(`${event.summary} ${event.location}`);
    const hits = destinations.filter((d) =>
      d.names.some((n) => {
        const needle = normalise(n);
        return needle.trim() !== "" && haystack.includes(needle);
      }),
    );
    if (hits.length === 0) {
      unmatched.push(event);
      continue;
    }
    for (const dest of hits) {
      const list = byDest.get(dest.slug) ?? [];
      list.push({ from: event.start, to: event.end, events: [event.summary] });
      byDest.set(dest.slug, list);
    }
  }
  const suggestions = destinations.flatMap((d) => {
    const ranges = byDest.get(d.slug);
    return ranges ? [{ slug: d.slug, ranges: mergeRanges(ranges) }] : [];
  });
  return { suggestions, unmatched };
}
