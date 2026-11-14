import config from "@payload-config";
import { sql, type PostgresAdapter } from "@payloadcms/db-postgres";
import { getPayload } from "payload";

import { SHORT_LINK_SLUG_PATTERN, validateDestination } from "./short-links";

/**
 * Looks up an active short link and counts the click in one atomic UPDATE
 * (`clicks = clicks + 1`), so concurrent hits never lose a count.
 * Returns null for unknown, inactive or malformed slugs.
 */
export async function resolveShortLink(slug: string): Promise<string | null> {
  if (!SHORT_LINK_SLUG_PATTERN.test(slug)) return null;

  const payload = await getPayload({ config });
  const db = payload.db as unknown as PostgresAdapter;
  const result = await db.drizzle.execute<{ destination: string }>(sql`
    UPDATE "short_links"
    SET "clicks" = COALESCE("clicks", 0) + 1, "last_clicked_at" = now()
    WHERE "slug" = ${slug} AND "active" = true
    RETURNING "destination"
  `);

  const destination = result.rows[0]?.destination;
  // Re-check on the way out, in case a row was written around the validator.
  if (!destination || validateDestination(destination) !== true) return null;
  return destination;
}
