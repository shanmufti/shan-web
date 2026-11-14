/**
 * JWT decoding only. Never verifies the signature and never sends the token
 * anywhere. Runs in the browser.
 */

import { base64ToBytes } from "./encoding";

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: unknown;
  signature: string;
  /** Seconds since the epoch, when present and numeric. */
  times: { name: "exp" | "iat" | "nbf"; seconds: number }[];
}

export type JwtResult =
  { ok: true; jwt: DecodedJwt } | { ok: false; error: string };

function decodePart(part: string, label: string): unknown {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(
      base64ToBytes(part),
    );
  } catch {
    throw new Error(`The ${label} is not valid Base64URL.`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`The ${label} is not JSON.`);
  }
}

export function decodeJwt(token: string): JwtResult {
  const trimmed = token.trim().replace(/^Bearer\s+/i, "");
  if (trimmed === "") return { ok: false, error: "Paste a token to decode." };
  const parts = trimmed.split(".");
  if (parts.length === 5) {
    return {
      ok: false,
      error:
        "This looks like an encrypted JWE (5 parts). Only signed JWTs (3 parts) can be decoded without the key.",
    };
  }
  if (parts.length !== 3) {
    return {
      ok: false,
      error: `A JWT has 3 parts separated by dots; this has ${String(parts.length)}.`,
    };
  }
  const [h = "", p = "", s = ""] = parts;
  try {
    const header = decodePart(h, "header");
    if (!header || typeof header !== "object" || Array.isArray(header)) {
      return { ok: false, error: "The header is not a JSON object." };
    }
    const payload = decodePart(p, "payload");
    const times: DecodedJwt["times"] = [];
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const record = payload as Record<string, unknown>;
      for (const name of ["iat", "nbf", "exp"] as const) {
        const value = record[name];
        if (typeof value === "number" && Number.isFinite(value)) {
          times.push({ name, seconds: value });
        }
      }
    }
    return {
      ok: true,
      jwt: {
        header: header as Record<string, unknown>,
        payload,
        signature: s,
        times,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export type ExpiryStatus = "expired" | "valid" | "not-yet-valid" | "no-expiry";

export function expiryStatus(
  jwt: DecodedJwt,
  nowMs = Date.now(),
): ExpiryStatus {
  const nbf = jwt.times.find((t) => t.name === "nbf");
  if (nbf && nbf.seconds * 1000 > nowMs) return "not-yet-valid";
  const exp = jwt.times.find((t) => t.name === "exp");
  if (!exp) return "no-expiry";
  return exp.seconds * 1000 <= nowMs ? "expired" : "valid";
}
