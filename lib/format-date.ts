export function formatDate(isodate: string) {
  return new Date(isodate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
