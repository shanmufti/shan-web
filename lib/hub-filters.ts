/**
 * Small helpers for the section hubs' URL filters (?year=2024&tag=hikes).
 * Filters are plain GET params so they work without JavaScript and can be
 * bookmarked; unknown values simply match nothing.
 */

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

/** First value of a search param, trimmed; "" when missing. */
export function param(params: SearchParamsRecord, name: string): string {
  const value = params[name];
  const first = Array.isArray(value) ? value[0] : value;
  return (first ?? "").trim();
}

/** UTC year of an ISO date, as a string ("2024"). */
export function yearOf(isodate: string): string {
  return String(new Date(isodate).getUTCFullYear());
}

/** Distinct years, newest first, as select options. */
export function yearOptions(dates: string[]) {
  return [...new Set(dates.map(yearOf))]
    .sort((a, b) => b.localeCompare(a))
    .map((year) => ({ value: year, label: year }));
}

/** Distinct tags with counts, most used first, as select options. */
export function tagOptions(tagLists: (string[] | null | undefined)[]) {
  const counts = new Map<string, number>();
  for (const tags of tagLists) {
    for (const tag of tags ?? []) {
      const key = tag.trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({
      value: tag,
      label: `${tag} (${String(count)})`,
    }));
}

export function hasTag(tags: string[] | null | undefined, tag: string) {
  return (tags ?? []).some((t) => t.trim().toLowerCase() === tag);
}

/** Query string from the params that are set, e.g. "?year=2024". */
export function queryString(params: Record<string, string>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** "1 story", "3 stories". */
export function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}
