/** Base64 and URL encoding with UTF-8 support. Runs in the browser. */

export type Converted =
  { ok: true; output: string } | { ok: false; error: string };

function bytesToBinary(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return binary;
}

function trimPadding(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "=") end--;
  return value.slice(0, end);
}

export function bytesToBase64(bytes: Uint8Array, urlSafe = false): string {
  const base64 = btoa(bytesToBinary(bytes));
  if (!urlSafe) return base64;
  return trimPadding(base64.replaceAll("+", "-").replaceAll("/", "_"));
}

export function base64Encode(text: string, urlSafe = false): string {
  return bytesToBase64(new TextEncoder().encode(text), urlSafe);
}

/** Decodes standard or URL-safe Base64, with or without padding. */
export function base64ToBytes(input: string): Uint8Array {
  const cleaned = input.replaceAll(/\s+/g, "");
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(cleaned)) {
    throw new Error("Contains characters that are not Base64.");
  }
  const standard = cleaned.replaceAll("-", "+").replaceAll("_", "/");
  const unpadded = trimPadding(standard);
  if (unpadded.length % 4 === 1) {
    throw new Error("Length is not valid for Base64.");
  }
  const padded = unpadded + "=".repeat((4 - (unpadded.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function base64Decode(input: string): Converted {
  if (input.trim() === "") return { ok: true, output: "" };
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(input);
  } catch (error) {
    return {
      ok: false,
      error: `Not valid Base64: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  try {
    return {
      ok: true,
      output: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    };
  } catch {
    return {
      ok: false,
      error: `Decoded ${String(bytes.length)} bytes, but they are not UTF-8 text (probably binary data).`,
    };
  }
}

export type UrlMode = "component" | "uri";

export function urlEncode(text: string, mode: UrlMode = "component"): string {
  return mode === "component" ? encodeURIComponent(text) : encodeURI(text);
}

export function urlDecode(
  text: string,
  options: { mode?: UrlMode; plusAsSpace?: boolean } = {},
): Converted {
  const input = options.plusAsSpace ? text.replaceAll("+", " ") : text;
  try {
    return {
      ok: true,
      output:
        options.mode === "uri" ? decodeURI(input) : decodeURIComponent(input),
    };
  } catch {
    const bad = /%(?![0-9A-Fa-f]{2})|%[0-9A-Fa-f]{2}/.exec(input);
    return {
      ok: false,
      error: bad
        ? `Malformed percent-encoding near position ${String(bad.index + 1)}. Each % must start a valid UTF-8 sequence like %20 or %C3%A9.`
        : "Malformed percent-encoding.",
    };
  }
}

/** Query parameters of a full URL, for display. Null when it isn't a URL. */
export function queryParams(text: string): [string, string][] | null {
  try {
    const url = new URL(text.trim());
    return [...url.searchParams.entries()];
  } catch {
    return null;
  }
}
