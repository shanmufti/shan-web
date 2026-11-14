/** Shared limits for one-time secrets. Safe to import anywhere. */

export const SECRET_EXPIRY_OPTIONS = [
  { value: "1h", label: "1 hour", ms: 60 * 60 * 1000 },
  { value: "1d", label: "1 day", ms: 24 * 60 * 60 * 1000 },
  { value: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
] as const;

export type SecretExpiry = (typeof SECRET_EXPIRY_OPTIONS)[number]["value"];

/** Longest secret text, in UTF-8 bytes. */
export const MAX_SECRET_BYTES = 10_000;

/**
 * Longest ciphertext the server accepts (base64url). Two AES-GCM layers add
 * 12 + 16 + 16 bytes to the text; base64 adds a third.
 */
export const MAX_CIPHERTEXT_CHARS = 13_500;

/** New secrets per visitor per hour. */
export const SECRET_CREATE_LIMIT = 20;

export const PBKDF2_ITERATIONS = 600_000;

export function secretExpiryMs(value: unknown): number | null {
  return SECRET_EXPIRY_OPTIONS.find((o) => o.value === value)?.ms ?? null;
}
