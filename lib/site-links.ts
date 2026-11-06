/** Passcode page that sends the visitor back to `next` once unlocked. */
export function unlockHref(next: string): string {
  return `/unlock?next=${encodeURIComponent(next)}`;
}
