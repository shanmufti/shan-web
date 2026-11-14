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
  /** `srcset` across the WebP sizes (thumb, card, large), when present. */
  srcSet?: string | undefined;
}

/** Payload image sizes, smallest first (collections/Media.ts). */
const SRCSET_SIZES = ["thumb", "card", "large"] as const;

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
    srcSet: srcSetOf(media),
  };
}

/** "…-480x320.webp 480w, …-960x640.webp 960w, …" or undefined. */
function srcSetOf(media: MediaLike): string | undefined {
  const entries = SRCSET_SIZES.flatMap((name) => {
    const size = media.sizes?.[name];
    return size?.url && size.width ? [`${size.url} ${size.width}w`] : [];
  });
  return entries.length > 0 ? entries.join(", ") : undefined;
}

/** URL of a populated media relation (card size when available). */
export function mediaUrl(value: unknown): string | undefined {
  return mediaImage(value, "card")?.src;
}

export function mediaAlt(value: unknown): string | undefined {
  return asMedia(value)?.alt ?? undefined;
}
