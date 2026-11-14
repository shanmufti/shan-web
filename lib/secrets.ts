import config from "@payload-config";
import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { sql } from "@payloadcms/db-postgres/drizzle";
import { getPayload } from "payload";

import { MAX_CIPHERTEXT_CHARS } from "@/lib/secret-options";
import { looksLikeToken, newShortToken } from "@/lib/tokens";

/**
 * Server side of one-time secrets. The server only ever sees ciphertext, the
 * AES-GCM IV and (with a passphrase) the PBKDF2 salt. Reading a secret
 * deletes it in the same SQL statement, so it can be read exactly once.
 */

export interface StoredSecret {
  ciphertext: string;
  iv: string;
  salt: string | null;
}

const B64URL = /^[\w-]+$/;

async function db() {
  const payload = await getPayload({ config });
  return (payload.db as unknown as PostgresAdapter).drizzle;
}

/** Removes expired rows. Called opportunistically on create and open. */
export async function deleteExpiredSecrets(): Promise<void> {
  await (
    await db()
  ).execute(sql`DELETE FROM secrets WHERE expires_at <= now()`);
}

export function isValidSecretInput(input: unknown): input is StoredSecret {
  if (!input || typeof input !== "object") return false;
  const { ciphertext, iv, salt } = input as Record<string, unknown>;
  if (typeof ciphertext !== "string" || typeof iv !== "string") return false;
  if (ciphertext.length === 0 || ciphertext.length > MAX_CIPHERTEXT_CHARS) {
    return false;
  }
  if (!B64URL.test(ciphertext) || !/^[\w-]{16}$/.test(iv)) return false;
  return (
    salt === null || (typeof salt === "string" && /^[\w-]{22}$/.test(salt))
  );
}

export async function createSecret(
  input: StoredSecret,
  expiresInMs: number,
): Promise<{ id: string; expiresAt: string }> {
  const payload = await getPayload({ config });
  const id = newShortToken();
  const expiresAt = new Date(Date.now() + expiresInMs).toISOString();
  await payload.create({
    collection: "secrets",
    data: {
      secretId: id,
      ciphertext: input.ciphertext,
      iv: input.iv,
      salt: input.salt,
      expiresAt,
    },
    overrideAccess: true,
  });
  return { id, expiresAt };
}

/** True if an unexpired secret exists. Doesn't burn it (for the page). */
export async function secretIsWaiting(id: string): Promise<boolean> {
  if (!looksLikeToken(id)) return false;
  const result = await (
    await db()
  ).execute(sql`
    SELECT 1 FROM secrets WHERE secret_id = ${id} AND expires_at > now()
  `);
  return result.rows.length > 0;
}

/**
 * Returns the secret and deletes it in one statement. A second call, or a
 * call after expiry, gets null.
 */
export async function burnSecret(id: string): Promise<StoredSecret | null> {
  if (!looksLikeToken(id)) return null;
  const conn = await db();
  const result = await conn.execute(sql`
    DELETE FROM secrets
    WHERE secret_id = ${id} AND expires_at > now()
    RETURNING ciphertext, iv, salt
  `);
  await conn.execute(sql`DELETE FROM secrets WHERE expires_at <= now()`);
  const row = result.rows[0];
  if (!row) return null;
  return {
    ciphertext: String(row["ciphertext"]),
    iv: String(row["iv"]),
    salt: typeof row["salt"] === "string" ? row["salt"] : null,
  };
}
