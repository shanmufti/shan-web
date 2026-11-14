import config from "@payload-config";
import { getPayload } from "payload";

import { buildVaultCalendar } from "@/lib/ical";
import { siteUrl } from "@/lib/site-url";
import { looksLikeToken, tokensMatch } from "@/lib/tokens";
import { allEvents, dayKey } from "@/lib/vault";
import { allVaultRecordsForFeed } from "@/lib/vault-data";

/** Past events kept in the feed, so recent ones don't vanish at once. */
const KEEP_PAST_DAYS = 90;

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Private iCalendar feed of renewals and expiries. Phone calendars can't
 * log in, so the proxy lets this one path through and the token in the
 * query string is checked here; a missing or wrong token is a plain 404.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!looksLikeToken(token)) return notFound();

  const payload = await getPayload({ config });
  const settings = await payload.findGlobal({
    slug: "vault-settings",
    overrideAccess: true,
    depth: 0,
  });
  const expected = settings.calendarToken;
  if (!expected || !tokensMatch(token, expected)) return notFound();

  const today = dayKey(new Date()) ?? "";
  const records = await allVaultRecordsForFeed(payload);
  const events = allEvents(records, today).filter(
    (e) => e.daysAway >= -KEEP_PAST_DAYS,
  );
  const body = buildVaultCalendar(events, { origin: siteUrl() });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="vault.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
