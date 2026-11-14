import { randomBytes, timingSafeEqual } from "node:crypto";

/** 32 random bytes as URL-safe text (43 characters). */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Constant-time string comparison for secret tokens. */
export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Cheap shape check before touching the database. */
export function looksLikeToken(value: string): boolean {
  return /^[\w-]{20,64}$/.test(value);
}
