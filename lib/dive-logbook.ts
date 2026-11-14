import type {
  DiveDepthPoint,
  DivesPerYear,
} from "@/components/diving/dive-logbook-charts";
import { diveBottomTime, diveMaxDepth, type DiveDoc } from "@/lib/content";
import { formatMonthYear } from "@/lib/format-date";
import { plural, yearOf } from "@/lib/hub-filters";

/** Dives per calendar year, oldest first, including empty years between. */
export function divesPerYear(dives: DiveDoc[]): DivesPerYear[] {
  if (dives.length === 0) return [];
  const counts = new Map<number, number>();
  for (const dive of dives) {
    const year = Number(yearOf(dive.date));
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  const years = [...counts.keys()];
  const out: DivesPerYear[] = [];
  for (let y = Math.min(...years); y <= Math.max(...years); y++) {
    out.push({ year: String(y), dives: counts.get(y) ?? 0 });
  }
  return out;
}

/** Max depth of every dive that has one, oldest first. */
export function diveDepths(dives: DiveDoc[]): DiveDepthPoint[] {
  return [...dives]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((dive) => {
      const depth = diveMaxDepth(dive);
      return depth == null
        ? []
        : [{ label: formatMonthYear(dive.date), title: dive.title, depth }];
    });
}

/** Factual stats line for the diving hub. */
export function diveStats(dives: DiveDoc[]): string[] {
  if (dives.length === 0) return [];
  const depths = dives.flatMap((d) => {
    const v = diveMaxDepth(d);
    return v == null ? [] : [v];
  });
  const minutes = dives.reduce((sum, d) => sum + (diveBottomTime(d) ?? 0), 0);
  const hours = Math.round(minutes / 6) / 10;
  return [
    plural(dives.length, "dive", "dives"),
    ...(depths.length > 0 ? [`deepest ${String(Math.max(...depths))} m`] : []),
    ...(minutes > 0 ? [`${String(hours)} h underwater`] : []),
  ];
}

export function diveSite(dive: DiveDoc): string {
  return dive.siteDetail
    ? `${dive.siteDetail}, ${dive.siteName ?? dive.location.name}`
    : (dive.siteName ?? dive.location.name);
}
