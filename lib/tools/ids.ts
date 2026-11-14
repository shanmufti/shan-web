/** UUID v4/v7 and nanoid, from the browser's crypto.getRandomValues. */

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toUuidString(bytes: Uint8Array): string {
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** RFC 9562 version 4: 122 random bits. */
export function uuidV4(): string {
  const bytes = randomBytes(16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  return toUuidString(bytes);
}

/** RFC 9562 version 7: 48-bit Unix ms timestamp, then random bits. Sorts by time. */
export function uuidV7(nowMs: number = Date.now()): string {
  const bytes = randomBytes(16);
  let ts = Math.floor(nowMs);
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ts % 256;
    ts = Math.floor(ts / 256);
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  return toUuidString(bytes);
}

/** Timestamp embedded in a v7 UUID, or null for other versions. */
export function uuidV7Time(uuid: string): number | null {
  const hex = uuid.replaceAll("-", "");
  if (!/^[0-9a-f]{32}$/i.test(hex) || hex[12] !== "7") return null;
  return Number.parseInt(hex.slice(0, 12), 16);
}

export const NANOID_ALPHABET =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

/**
 * Nanoid-style ID: uniform over the alphabet (rejection sampling, no modulo
 * bias). Default 21 characters from the URL-safe 64-symbol alphabet.
 */
export function nanoid(size = 21, alphabet = NANOID_ALPHABET): string {
  const symbols = [...new Set(alphabet)];
  if (symbols.length < 2 || symbols.length > 256) {
    throw new Error("Alphabet needs 2 to 256 distinct characters.");
  }
  if (!Number.isInteger(size) || size < 1 || size > 256) {
    throw new Error("Length must be between 1 and 256.");
  }
  const mask = (2 << Math.floor(Math.log2(symbols.length - 1))) - 1;
  const step = Math.ceil((1.6 * mask * size) / symbols.length);
  let id = "";
  for (;;) {
    const bytes = randomBytes(step);
    for (const byte of bytes) {
      const index = byte & mask;
      const symbol = symbols[index];
      if (symbol !== undefined) {
        id += symbol;
        if (id.length === size) return id;
      }
    }
  }
}
