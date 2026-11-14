import Image from "next/image";

import type { MediaImage } from "@/lib/media";

/**
 * The one way to render a Payload media image (hosted on R2).
 *
 * - Served straight from R2: `unoptimized`, so no Vercel image optimisation
 *   (not on the free plan) and no request through our server.
 * - Explicit width/height from Payload so the browser reserves space (no
 *   layout shift); CSS still controls the rendered size.
 * - Lazy by default. Pass `priority` for images above the fold (loaded
 *   eagerly at high fetch priority; Next 16 recommends this over preload).
 * - `sizes` describes the rendered width, for when Payload image sizes are
 *   added and a srcset can be served.
 */
export function Picture({
  image,
  sizes,
  priority = false,
  className,
  fallbackWidth = 1200,
  fallbackHeight = 800,
}: Readonly<{
  image: MediaImage;
  /** Rendered width, e.g. "(min-width: 1024px) 33vw, 100vw". */
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Used when Payload has no recorded dimensions (non-image uploads). */
  fallbackWidth?: number;
  fallbackHeight?: number;
}>) {
  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={image.width ?? fallbackWidth}
      height={image.height ?? fallbackHeight}
      sizes={sizes}
      unoptimized
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={className}
    />
  );
}
