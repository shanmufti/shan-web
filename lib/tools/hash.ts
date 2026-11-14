/** SHA digests via WebCrypto (crypto.subtle). Runs in the browser. */

import { bytesToBase64 } from "./encoding";

export const HASH_ALGORITHMS = [
  "SHA-1",
  "SHA-256",
  "SHA-384",
  "SHA-512",
] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

export function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function digest(
  algorithm: HashAlgorithm,
  data: Uint8Array | string,
): Promise<{ hex: string; base64: string }> {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  const buffer = await crypto.subtle.digest(algorithm, bytes as BufferSource);
  const out = new Uint8Array(buffer);
  return { hex: toHex(out), base64: bytesToBase64(out) };
}

export async function digestAll(
  data: Uint8Array | string,
): Promise<Record<HashAlgorithm, { hex: string; base64: string }>> {
  const entries = await Promise.all(
    HASH_ALGORITHMS.map(async (a) => [a, await digest(a, data)] as const),
  );
  return Object.fromEntries(entries) as Record<
    HashAlgorithm,
    { hex: string; base64: string }
  >;
}
