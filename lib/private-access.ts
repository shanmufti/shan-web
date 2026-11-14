import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

import type { Payload } from "payload";

import { requireEnv } from "@/lib/env";

/**
 * Passcode gate for private journeys, stories (and later, private photos).
 *
 * - The owner sets the passcode in /admin → Site settings. Only a scrypt hash
 *   is stored (`salt:hash`).
 * - A correct passcode sets an HttpOnly cookie whose value is an HMAC of the
 *   stored hash keyed with PAYLOAD_SECRET. Changing the passcode changes the
 *   hash, which invalidates every existing cookie.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export const PRIVATE_ACCESS_COOKIE = "private_access";
export const PRIVATE_ACCESS_MAX_AGE = 60 * 60 * 24 * 30;

const KEY_LENGTH = 32;

export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(passcode, salt, KEY_LENGTH);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPasscode(
  passcode: string,
  stored: string,
): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(passcode, salt, KEY_LENGTH);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function accessTokenFor(passcodeHash: string): string {
  return createHmac("sha256", requireEnv("PAYLOAD_SECRET"))
    .update(`private:${passcodeHash}`)
    .digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function getPasscodeHash(
  payload: Payload,
): Promise<string | null> {
  const settings = await payload.findGlobal({
    slug: "site-settings",
    overrideAccess: true,
  });
  return settings.privatePasscodeHash ?? null;
}

/** True when `token` is the cookie value for the passcode with this hash. */
export function tokenMatchesHash(
  token: string | undefined,
  hash: string | null,
): boolean {
  if (!token || !hash) return false;
  return safeEqualHex(token, accessTokenFor(hash));
}

/** Payload's session cookie (`${cookiePrefix}-token`, prefix "payload"). */
export const PAYLOAD_TOKEN_COOKIE = "payload-token";

/**
 * Could this request carry a Payload login? Without the session cookie or an
 * Authorization header, payload.auth() can only answer "no user", so callers
 * skip it (and the DB/Payload start-up it needs) for anonymous visitors.
 */
export function mayHaveSession(
  hasCookie: (name: string) => boolean,
  authorizationHeader: string | null,
): boolean {
  return hasCookie(PAYLOAD_TOKEN_COOKIE) || Boolean(authorizationHeader);
}

export function readCookie(
  cookieHeader: string | null,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}
