/**
 * Helpers for Payload `media` docs (stored on R2, served from R2_PUBLIC_URL).
 * Pure functions, safe in server and client code.
 */

export interface MediaImage {
  src: string;
  alt: string;
  /** Intrinsic size in px, when Payload recorded it. */
  width?: number | undefined;
  height?: number | undefined;
}

interface MediaLike {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  sizes?: Record<
    string,
    | {
        url?: string | null;
        width?: number | null;
        height?: number | null;
      }
    | undefined
  > | null;
}

function asMedia(value: unknown): MediaLike | null {
  return value && typeof value === "object" ? value : null;
}

/**
 * A populated media relation as an image to render. Prefers the named
 * Payload image size (e.g. "card") when the upload has one, else the
 * original. Undefined when the relation isn't populated or has no URL.
 */
export function mediaImage(
  value: unknown,
  size?: string,
): MediaImage | undefined {
  const media = asMedia(value);
  if (!media) return undefined;
  const sized = size ? media.sizes?.[size] : undefined;
  const pick = sized?.url ? sized : media;
  if (!pick.url) return undefined;
  return {
    src: pick.url,
    alt: media.alt ?? "",
    width: pick.width ?? undefined,
    height: pick.height ?? undefined,
  };
}

/** URL of a populated media relation (card size when available). */
export function mediaUrl(value: unknown): string | undefined {
  return mediaImage(value, "card")?.src;
}

export function mediaAlt(value: unknown): string | undefined {
  return asMedia(value)?.alt ?? undefined;
}
