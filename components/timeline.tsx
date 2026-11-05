import { ArrowUpRight, Lock } from "lucide-react";
import Link from "next/link";

import { formatDate, formatDateRange } from "@/lib/format-date";
import { unlockHref } from "@/lib/site-links";
import type { TimelineEntry, TimelineYear } from "@/lib/home";
import {
  journeyCountryNames,
  mediaAlt,
  mediaUrl,
  type Listed,
  type StoryDoc,
} from "@/lib/journeys";

function Thumb({
  src,
  alt,
}: Readonly<{ src?: string | undefined; alt?: string | undefined }>) {
  return (
    <div className="bg-muted aspect-[3/2] w-full overflow-hidden rounded-md sm:w-36">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          className="size-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.04]"
        />
      ) : null}
    </div>
  );
}

function LockedRow({
  kind,
  title,
  dateLabel,
  next,
}: Readonly<{ kind: string; title: string; dateLabel: string; next: string }>) {
  return (
    <Link
      href={unlockHref(next)}
      className="group grid gap-4 py-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6"
    >
      <div className="bg-muted flex aspect-[3/2] w-full items-center justify-center rounded-md sm:w-36">
        <Lock className="text-muted-foreground size-4" aria-hidden="true" />
      </div>
      <div>
        <p className="meta-label text-muted-foreground">
          {kind} · {dateLabel} · Private
        </p>
        <h3 className="mt-1.5 text-xl font-medium tracking-tight underline-offset-4 group-hover:underline">
          {title}
        </h3>
        <p className="text-muted-foreground mt-1 text-[0.95rem]">
          Enter the passcode to read.
        </p>
      </div>
    </Link>
  );
}

function NestedStories({ stories }: Readonly<{ stories: Listed<StoryDoc>[] }>) {
  if (stories.length === 0) return null;
  return (
    <ul className="mt-4 space-y-2 pl-6">
      {stories.map((story) => {
        const href = story.locked
          ? unlockHref(`/blog/${story.slug}`)
          : `/blog/${story.doc.slug}`;
        const title = story.locked ? story.title : story.doc.title;
        const date = story.locked ? story.date : story.doc.date;
        return (
          <li key={story.locked ? story.id : story.doc.id}>
            <Link
              href={href}
              className="group/story flex items-baseline gap-3 text-[0.95rem]"
            >
              <span className="meta-label text-muted-foreground w-14 shrink-0">
                {new Date(date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </span>
              <span className="underline-offset-4 group-hover/story:underline">
                {title}
              </span>
              {story.locked ? (
                <Lock
                  className="text-muted-foreground size-3 shrink-0"
                  aria-label="Private"
                />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Entry({ entry }: Readonly<{ entry: TimelineEntry }>) {
  if (entry.kind === "journey") {
    const { item } = entry;
    if (item.locked) {
      return (
        <LockedRow
          kind="Journey"
          title={item.title}
          dateLabel={formatDateRange(item.date, item.endDate)}
          next={`/travel/${item.slug}`}
        />
      );
    }
    const journey = item.doc;
    return (
      <div className="py-6">
        <Link
          href={`/travel/${journey.slug}`}
          className="group grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6"
        >
          <Thumb src={mediaUrl(journey.cover)} alt={mediaAlt(journey.cover)} />
          <div>
            <p className="meta-label text-muted-foreground">
              Journey · {formatDateRange(journey.startDate, journey.endDate)} ·{" "}
              {journeyCountryNames(journey).join(", ")}
            </p>
            <h3 className="mt-1.5 flex items-start gap-1 text-xl font-medium tracking-tight underline-offset-4 group-hover:underline sm:text-2xl">
              {journey.title}
              <ArrowUpRight
                className="text-muted-foreground mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              />
            </h3>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-[0.95rem]">
              {journey.summary}
            </p>
          </div>
        </Link>
        <div className="sm:pl-[10.5rem]">
          <NestedStories stories={entry.stories} />
        </div>
      </div>
    );
  }

  const { item } = entry;
  if (item.locked) {
    return (
      <LockedRow
        kind="Story"
        title={item.title}
        dateLabel={formatDate(item.date)}
        next={`/blog/${item.slug}`}
      />
    );
  }
  const story = item.doc;
  return (
    <Link
      href={`/blog/${story.slug}`}
      className="group grid gap-4 py-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6"
    >
      <Thumb src={mediaUrl(story.cover)} alt={mediaAlt(story.cover)} />
      <div>
        <p className="meta-label text-muted-foreground">
          Story · {formatDate(story.date)}
          {story.location?.name ? ` · ${story.location.name}` : ""}
        </p>
        <h3 className="mt-1.5 text-xl font-medium tracking-tight underline-offset-4 group-hover:underline">
          {story.title}
        </h3>
        <p className="text-muted-foreground mt-1 line-clamp-2 text-[0.95rem]">
          {story.summary}
        </p>
      </div>
    </Link>
  );
}

/** Ledger-style timeline: sticky mono year column, hairline-separated rows. */
export function Timeline({ years }: Readonly<{ years: TimelineYear[] }>) {
  if (years.length === 0) {
    return (
      <p className="text-muted-foreground py-10">
        Journeys and stories will show up here as they&apos;re published.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {years.map((group) => (
        <section
          key={group.year}
          aria-label={String(group.year)}
          className="border-border grid border-t md:grid-cols-[8rem_minmax(0,1fr)]"
        >
          <h2 className="meta-label text-muted-foreground pt-7 md:sticky md:top-20 md:self-start">
            {group.year}
          </h2>
          <div className="divide-border divide-y">
            {group.entries.map((entry) => (
              <Entry key={entry.key} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
