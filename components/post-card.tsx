import { Lock } from "lucide-react";
import Link from "next/link";

import type { MediaImage } from "@/lib/media";
import { unlockHref } from "@/lib/site-links";
import { cn } from "@/lib/utils";

import { HUB_DETAIL, SharedCover } from "./page-transition";
import { Picture } from "./picture";

interface PostCardProps {
  href: string;
  title: string;
  summary?: string | undefined;
  /** Mono catalog line, e.g. "Journey · 2025 · Palau". */
  meta: string;
  tags?: string[] | undefined;
  image?: MediaImage | undefined;
  /** 3/2 for journeys, 4/5 for stories. */
  aspect?: "landscape" | "portrait";
  /** Shown large in the image slot when there is no cover yet. */
  placeholder?: string | undefined;
  /** Load the image eagerly (cards in the first row). */
  priority?: boolean | undefined;
  /** Passcode item the visitor has unlocked: shows a lock badge. */
  isPrivate?: boolean | undefined;
}

/** Lock chip on the image of a passcode item. */
function PrivateBadge() {
  return (
    <span className="bg-background/90 text-foreground border-border absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-xs backdrop-blur">
      <Lock className="size-3" aria-hidden="true" />
      Private
    </span>
  );
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
  aspect = "landscape",
  placeholder,
  priority = false,
  isPrivate,
}: Readonly<PostCardProps>) {
  return (
    <Link
      transitionTypes={HUB_DETAIL}
      href={href}
      className="group block outline-none"
    >
      <SharedCover href={href}>
        <div
          className={cn(
            "bg-tint-water border-border group-focus-visible:ring-ring relative overflow-hidden rounded-2xl border group-focus-visible:ring-2 group-focus-visible:ring-offset-2",
            aspectClass[aspect],
          )}
        >
          {image ? (
            <Picture
              image={image}
              sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
              priority={priority}
              className="size-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-end p-4">
              <span className="text-muted-foreground font-mono text-3xl tracking-tight uppercase">
                {placeholder ?? title.slice(0, 2)}
              </span>
            </div>
          )}
          {isPrivate ? <PrivateBadge /> : null}
        </div>
      </SharedCover>
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
          "bg-tint-water border-border texture-grain group-focus-visible:ring-ring relative flex items-center justify-center overflow-hidden rounded-2xl border border-dashed group-focus-visible:ring-2 group-focus-visible:ring-offset-2",
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

/** Wide card for a hub's featured item: image on one side, text on the other. */
export function FeaturedCard({
  href,
  title,
  summary,
  meta,
  image,
  placeholder,
  priority = false,
  isPrivate,
  label = "Featured",
}: Readonly<
  Omit<PostCardProps, "aspect" | "tags"> & { label?: string | undefined }
>) {
  return (
    <Link
      transitionTypes={HUB_DETAIL}
      href={href}
      className="group bg-card border-border lift rounded-tile grid overflow-hidden border outline-none focus-visible:outline-2 focus-visible:outline-offset-2 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      <SharedCover href={href}>
        <div className="bg-tint-water relative aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-80">
          {image ? (
            <Picture
              image={image}
              sizes="(min-width: 768px) 60vw, 100vw"
              priority={priority}
              className="absolute inset-0 size-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex size-full items-end p-6">
              <span className="text-muted-foreground font-mono text-5xl tracking-tight uppercase">
                {placeholder ?? title.slice(0, 2)}
              </span>
            </div>
          )}
          {isPrivate ? <PrivateBadge /> : null}
        </div>
      </SharedCover>
      <div className="flex flex-col justify-end gap-2 p-6 sm:p-8">
        <p className="eyebrow text-coral-ink">{label}</p>
        <p className="meta-label text-muted-foreground">{meta}</p>
        <h3 className="text-2xl leading-tight font-medium tracking-[-0.025em] underline-offset-4 group-hover:underline sm:text-3xl">
          {title}
        </h3>
        {summary ? (
          <p className="text-muted-foreground line-clamp-3">{summary}</p>
        ) : null}
      </div>
    </Link>
  );
}
