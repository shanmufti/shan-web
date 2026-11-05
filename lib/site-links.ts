/** Top-level sections, shared by the header and footer. */
export const siteLinks = [
  { href: "/travel", label: "Journeys" },
  { href: "/blog", label: "Stories" },
  { href: "/diving", label: "Diving" },
  { href: "/tech", label: "Tech" },
] as const;

/** Passcode page that sends the visitor back to `next` once unlocked. */
export function unlockHref(next: string): string {
  return `/unlock?next=${encodeURIComponent(next)}`;
}
