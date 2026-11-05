import { Lock } from "lucide-react";
import Link from "next/link";

import { unlockHref } from "@/lib/site-links";
import { cn } from "@/lib/utils";

interface PostCardProps {
  href: string;
  title: string;
  summary?: string | undefined;
  /** Mono catalog line, e.g. "Journey · 2025 · Palau". */
  meta: string;
  tags?: string[] | undefined;
  image?: string | undefined;
  imageAlt?: string | undefined;
  /** 3/2 for journeys, 4/5 for stories. */
  aspect?: "landscape" | "portrait";
  /** Shown large in the image slot when there is no cover yet. */
  placeholder?: string | undefined;
}

const aspectClass = {
  landscape: "aspect-[3/2]",
  portrait: "aspect-[4/5]",
} as const;

/** Flat, image-led card: no box, image at small radius, mono meta, title. */
export function PostCard({
  href,
  title,
  summary,
  meta,
  tags,
  image,
  imageAlt,
  aspect = "landscape",
  placeholder,
}: Readonly<PostCardProps>) {
  return (
    <Link href={href} className="group block outline-none">
      <div
        className={cn(
          "bg-muted group-focus-visible:ring-ring relative overflow-hidden rounded-md group-focus-visible:ring-2",
          aspectClass[aspect],
        )}
      >
        {image ? (
          // Plain <img>: covers come from R2 at fixed sizes (site plan §4).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={imageAlt ?? ""}
            loading="lazy"
            className="size-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-end p-4">
            <span className="text-muted-foreground/70 font-mono text-3xl tracking-tight uppercase">
              {placeholder ?? title.slice(0, 2)}
            </span>
          </div>
        )}
      </div>
      <p className="meta-label text-muted-foreground mt-4">{meta}</p>
      <h3 className="mt-1.5 text-xl leading-snug font-medium tracking-tight underline-offset-4 group-hover:underline">
        {title}
      </h3>
      {summary ? (
        <p className="text-muted-foreground mt-1.5 line-clamp-2 text-[0.95rem]">
          {summary}
        </p>
      ) : null}
      {tags && tags.length > 0 ? (
        <p className="meta-label text-muted-foreground/80 mt-3">
          {tags.map((tag) => `#${tag}`).join("  ")}
        </p>
      ) : null}
    </Link>
  );
}

/** Private item seen without the passcode: title and date only. */
export function LockedCard({
  title,
  meta,
  next,
  aspect = "landscape",
}: Readonly<{
  title: string;
  meta: string;
  next: string;
  aspect?: "landscape" | "portrait";
}>) {
  return (
    <Link href={unlockHref(next)} className="group block outline-none">
      <div
        className={cn(
          "bg-muted group-focus-visible:ring-ring relative flex items-center justify-center overflow-hidden rounded-md group-focus-visible:ring-2",
          aspectClass[aspect],
        )}
      >
        <span className="meta-label text-muted-foreground inline-flex items-center gap-2">
          <Lock className="size-3.5" aria-hidden="true" />
          Private
        </span>
      </div>
      <p className="meta-label text-muted-foreground mt-4">{meta}</p>
      <h3 className="mt-1.5 text-xl leading-snug font-medium tracking-tight underline-offset-4 group-hover:underline">
        {title}
      </h3>
      <p className="text-muted-foreground mt-1.5 text-[0.95rem]">
        Enter the passcode to read.
      </p>
    </Link>
  );
}
