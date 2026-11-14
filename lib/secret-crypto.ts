/**
 * Browser-side encryption for one-time secrets (WebCrypto only).
 *
 * - A random 256-bit AES-GCM key encrypts the text. It's put in the link's
 *   #fragment, which browsers never send to the server.
 * - With a passphrase, the text is first encrypted with a second AES-GCM key
 *   derived by PBKDF2-SHA-256 (600k iterations, random salt). The inner
 *   layer's IV is stored in front of its ciphertext.
 */

import { PBKDF2_ITERATIONS } from "@/lib/secret-options";

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  salt: string | null;
}

const IV_BYTES = 12;

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCodePoint(b);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const padded = text.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.codePointAt(i) ?? 0;
  return out;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

async function passphraseKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypts `text`; returns what the server stores plus the link key. */
export async function encryptSecret(
  text: string,
  passphrase: string,
): Promise<{ payload: EncryptedSecret; key: string }> {
  let data: Uint8Array<ArrayBuffer> = new TextEncoder().encode(text);
  let salt: Uint8Array<ArrayBuffer> | null = null;

  if (passphrase) {
    salt = randomBytes(16);
    const innerIv = randomBytes(IV_BYTES);
    const inner = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: innerIv },
        await passphraseKey(passphrase, salt),
        data,
      ),
    );
    data = new Uint8Array(IV_BYTES + inner.length);
    data.set(innerIv);
    data.set(inner, IV_BYTES);
  }

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = randomBytes(IV_BYTES);
  const outer = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data),
  );
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));

  return {
    payload: {
      ciphertext: toBase64Url(outer),
      iv: toBase64Url(iv),
      salt: salt ? toBase64Url(salt) : null,
    },
    key: toBase64Url(rawKey),
  };
}

/** Removes the link-key layer. Throws if the key is wrong. */
export async function decryptOuter(
  secret: EncryptedSecret,
  linkKey: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey(
    "raw",
    fromBase64Url(linkKey),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(secret.iv) },
      key,
      fromBase64Url(secret.ciphertext),
    ),
  );
}

/** Removes the passphrase layer. Throws if the passphrase is wrong. */
export async function decryptInner(
  inner: Uint8Array<ArrayBuffer>,
  salt: string,
  passphrase: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await passphraseKey(passphrase, fromBase64Url(salt));
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: inner.slice(0, IV_BYTES) },
      key,
      inner.slice(IV_BYTES),
    ),
  );
}

export function decodeText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
