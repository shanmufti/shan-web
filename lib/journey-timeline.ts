import {
  journeyCountries,
  journeyCountryNames,
  journeyDays,
  type JourneyDoc,
  type Listed,
} from "@/lib/journeys";

/**
 * Data for the journeys page: one flat row per journey (open or locked),
 * grouped by year for the vertical timeline.
 */

export interface JourneyRow {
  key: string;
  slug: string;
  title: string;
  start: string;
  end: string | null;
  locked: boolean;
  countries: string[];
  countryNames: string[];
  days: number | null;
}

export function toRows(items: Listed<JourneyDoc>[]): JourneyRow[] {
  return items.map((item) => {
    if (item.locked) {
      return {
        key: String(item.id),
        slug: item.slug,
        title: item.title,
        start: item.date,
        end: item.endDate ?? null,
        locked: true,
        countries: [],
        countryNames: [],
        days: null,
      };
    }
    const doc = item.doc;
    const countries = journeyCountries(doc);
    return {
      key: String(doc.id),
      slug: doc.slug,
      title: doc.title,
      start: doc.startDate,
      end: doc.endDate ?? null,
      locked: false,
      countries,
      countryNames: journeyCountryNames(doc),
      days: journeyDays(doc),
    };
  });
}

/** Rows grouped by start year, newest year first, newest trip first. */
export function groupByYear(
  rows: JourneyRow[],
): { year: number; rows: JourneyRow[] }[] {
  const map = new Map<number, JourneyRow[]>();
  for (const row of rows) {
    const year = new Date(row.start).getUTCFullYear();
    map.set(year, [...(map.get(year) ?? []), row]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, list]) => ({
      year,
      rows: [...list].sort((a, b) => b.start.localeCompare(a.start)),
    }));
}

/** Anchor id of a year's section; the year bar links to it. */
export function yearAnchor(year: number): string {
  return `year-${String(year)}`;
}

const DAY_MS = 86_400_000;

/**
 * Days spent travelling, counting overlapping trips (a side trip inside a
 * longer one) only once. Trips without an end date count as one day.
 */
export function totalDays(rows: JourneyRow[]): number {
  const spans = rows
    .map((r) => {
      const start = Date.parse(r.start);
      return [start, (r.end ? Date.parse(r.end) : start) + DAY_MS] as const;
    })
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [from, to] = [Number.NaN, Number.NaN];
  for (const [start, end] of spans) {
    if (Number.isNaN(from) || start > to) {
      if (!Number.isNaN(from)) total += to - from;
      [from, to] = [start, end];
    } else {
      to = Math.max(to, end);
    }
  }
  if (!Number.isNaN(from)) total += to - from;
  return Math.round(total / DAY_MS);
}
