export function formatDate(isodate: string) {
  return new Date(isodate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function utc(isodate: string) {
  return new Date(isodate);
}

/** "Mar 2024" */
export function formatMonthYear(isodate: string) {
  return utc(isodate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "Mar 3 – 18, 2024", "Mar 28 – Apr 4, 2024", "Dec 2023 – Jan 2024". */
export function formatDateRange(start: string, end?: string | null) {
  if (!end) return formatDate(start);
  const a = utc(start);
  const b = utc(end);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const sameMonth = sameYear && a.getUTCMonth() === b.getUTCMonth();
  const md = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  if (sameMonth)
    return `${md(a)} – ${String(b.getUTCDate())}, ${String(b.getUTCFullYear())}`;
  if (sameYear) return `${md(a)} – ${md(b)}, ${String(b.getUTCFullYear())}`;
  return `${formatMonthYear(start)} – ${formatMonthYear(end)}`;
}
