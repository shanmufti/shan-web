"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { VideoRef } from "@/lib/link-metadata";

function embedSrc(video: VideoRef, start: number) {
  if (video.host === "youtube") {
    const params = new URLSearchParams({ autoplay: "1", rel: "0" });
    if (start > 0) params.set("start", String(start));
    return `https://www.youtube-nocookie.com/embed/${video.id}?${params.toString()}`;
  }
  const hash = start > 0 ? `#t=${String(start)}s` : "";
  return `https://player.vimeo.com/video/${video.id}?autoplay=1&dnt=1${hash}`;
}

/**
 * Lightweight video: only a thumbnail until clicked, so no third-party
 * player (or cookie) loads until the visitor asks for it. YouTube plays from
 * youtube-nocookie.com.
 */
export function VideoEmbed({
  video,
  title,
  thumbnailUrl,
  startSeconds,
  startLabel,
}: Readonly<{
  video: VideoRef;
  title: string;
  thumbnailUrl: string | null;
  startSeconds: number;
  startLabel: string | null;
}>) {
  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // The image may fail before hydration, when onError isn't attached yet.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0) setThumbFailed(true);
  }, []);

  if (playing) {
    return (
      <div className="bg-muted aspect-video overflow-hidden rounded-lg">
        <iframe
          src={embedSrc(video, startSeconds)}
          title={title}
          className="size-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setPlaying(true);
      }}
      className="group/video bg-muted focus-visible:ring-ring relative block aspect-video w-full overflow-hidden rounded-lg outline-none focus-visible:ring-3"
    >
      <span className="sr-only">
        Play video: {title}
        {startLabel ? ` (from ${startLabel})` : ""}
      </span>
      {thumbnailUrl && !thumbFailed ? (
        // Plain <img>: remote thumbnails from the video host, any domain.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => {
            setThumbFailed(true);
          }}
          className="size-full object-cover transition-opacity group-hover/video:opacity-90"
        />
      ) : null}
      <span
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center bg-black/10"
      >
        <span className="bg-background/90 text-foreground grid size-12 place-items-center rounded-full shadow-sm transition-transform group-hover/video:scale-105 motion-reduce:transition-none">
          <Play className="ml-0.5 size-5" fill="currentColor" />
        </span>
      </span>
      {startLabel ? (
        <span
          aria-hidden="true"
          className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-xs text-white"
        >
          from {startLabel}
        </span>
      ) : null}
    </button>
  );
}
