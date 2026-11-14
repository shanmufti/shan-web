import { ExternalLink, Lock, Pencil, Star } from "lucide-react";

import { VideoEmbed } from "@/components/video-embed";
import { formatTimestamp } from "@/lib/hobby-stats";
import {
  labelFor,
  REFERENCE_KINDS,
  REFERENCE_STATUSES,
  SKILL_LEVELS,
} from "@/lib/hobby-options";
import { videoRefFor } from "@/lib/link-metadata";
import type { HobbyReference } from "@/payload-types";

function Meta({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <span className="border-border text-muted-foreground inline-flex h-5 items-center gap-1 rounded-full border px-2 text-xs">
      {children}
    </span>
  );
}

/** Click-to-play video, a linked Open Graph image, or nothing. */
function Preview({ reference }: Readonly<{ reference: HobbyReference }>) {
  const video = videoRefFor(reference.url);
  if (video) {
    const start = reference.startSeconds ?? 0;
    return (
      <VideoEmbed
        video={video}
        title={reference.title}
        thumbnailUrl={reference.thumbnailUrl ?? null}
        startSeconds={start}
        startLabel={start > 0 ? formatTimestamp(start) : null}
      />
    );
  }
  if (!reference.thumbnailUrl) return null;
  return (
    <a
      href={reference.url}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={-1}
      aria-hidden="true"
      className="bg-muted block aspect-video overflow-hidden rounded-lg"
    >
      {/* Plain <img>: Open Graph images can come from any domain. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={reference.thumbnailUrl}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="size-full object-cover"
      />
    </a>
  );
}

export function HobbyReferenceCard({
  reference,
  isOwner,
}: Readonly<{ reference: HobbyReference; isOwner: boolean }>) {
  const level = labelFor(SKILL_LEVELS, reference.skillLevel);
  const favourite = reference.status === "favourite";

  return (
    <article className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-3 ring-1">
      <Preview reference={reference} />

      <div className="flex flex-1 flex-col gap-2 px-1 pb-1">
        <h3 className="text-sm leading-snug font-medium">
          <a
            href={reference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-visible:ring-ring rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2"
          >
            {reference.title}
            <ExternalLink
              aria-hidden="true"
              className="text-muted-foreground ml-1 inline size-3 align-baseline"
            />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <Meta>{labelFor(REFERENCE_KINDS, reference.kind)}</Meta>
          {level ? <Meta>{level}</Meta> : null}
          <Meta>
            {favourite ? (
              <Star aria-hidden="true" className="size-3" fill="currentColor" />
            ) : null}
            {labelFor(REFERENCE_STATUSES, reference.status)}
          </Meta>
          {isOwner && reference.public === false ? (
            <Meta>
              <Lock aria-hidden="true" className="size-3" />
              Private
            </Meta>
          ) : null}
        </div>
        {reference.provider ? (
          <p className="text-muted-foreground text-xs">{reference.provider}</p>
        ) : null}
        {reference.note ? (
          <p className="text-sm whitespace-pre-line">{reference.note}</p>
        ) : null}
        {isOwner ? (
          <a
            href={`/admin/collections/hobby-references/${String(reference.id)}`}
            className="text-muted-foreground hover:text-foreground mt-auto inline-flex w-fit items-center gap-1 pt-1 text-xs underline-offset-4 hover:underline"
          >
            <Pencil aria-hidden="true" className="size-3" />
            Edit<span className="sr-only"> {reference.title}</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}
