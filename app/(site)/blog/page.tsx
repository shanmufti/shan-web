import { Rss } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { cache } from "react";

import { HobbyFilters } from "@/components/hobby-filters";
import { FeaturedCard, LockedCard, PostCard } from "@/components/post-card";
import {
  HubEmpty,
  HubGridSkeleton,
  HubHeading,
  HubStats,
  SectionHub,
} from "@/components/section-hub";
import { formatDate } from "@/lib/format-date";
import {
  hasTag,
  param,
  plural,
  tagOptions,
  yearOf,
  yearOptions,
} from "@/lib/hub-filters";
import {
  listStories,
  mediaAlt,
  mediaUrl,
  readingMinutes,
  storyJourney,
  type StoryDoc,
} from "@/lib/journeys";

export const metadata: Metadata = {
  title: "Stories",
  alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
};

// Stats and the list both need the visitor's stories; read them once.
const visibleStories = cache(listStories);

function storyMeta(doc: StoryDoc) {
  return [
    formatDate(doc.date),
    storyJourney(doc)?.title,
    `${String(readingMinutes(doc.body))} min`,
  ]
    .filter(Boolean)
    .join(" · ");
}

async function StoriesStats() {
  const stories = await visibleStories();
  if (stories.length === 0) return null;
  const journeys = new Set(
    stories.flatMap((s) => {
      const parent = s.locked ? null : storyJourney(s.doc);
      return parent ? [parent.slug] : [];
    }),
  );
  const years = stories.map((s) =>
    Number(yearOf(s.locked ? s.date : s.doc.date)),
  );
  const first = Math.min(...years);
  const last = Math.max(...years);
  return (
    <HubStats
      stats={[
        plural(stories.length, "story", "stories"),
        ...(journeys.size > 0
          ? [`from ${plural(journeys.size, "journey", "journeys")}`]
          : []),
        first === last ? String(first) : `${String(first)}–${String(last)}`,
      ]}
    />
  );
}

async function StoriesBody({
  searchParams,
}: Readonly<{ searchParams: PageProps<"/blog">["searchParams"] }>) {
  const [stories, params] = await Promise.all([visibleStories(), searchParams]);
  const year = param(params, "year");
  const tag = param(params, "tag").toLowerCase();
  const filtered = Boolean(year || tag);

  const open = stories.flatMap((s) => (s.locked ? [] : [s.doc]));
  const shown = stories.filter((s) => {
    if (year && yearOf(s.locked ? s.date : s.doc.date) !== year) return false;
    if (tag && (s.locked || !hasTag(s.doc.tags, tag))) return false;
    return true;
  });
  const featured = filtered ? undefined : open.find((doc) => doc.featured);
  const grid = shown.filter((s) => s.locked || s.doc.id !== featured?.id);

  if (stories.length === 0) {
    return (
      <div className="mt-14">
        <HubEmpty>No stories yet.</HubEmpty>
      </div>
    );
  }

  return (
    <>
      {featured ? (
        <section aria-labelledby="featured-story" className="mt-10">
          <h2 id="featured-story" className="sr-only">
            Featured story
          </h2>
          <FeaturedCard
            href={`/blog/${featured.slug}`}
            title={featured.title}
            summary={featured.summary}
            meta={storyMeta(featured)}
            image={mediaUrl(featured.cover)}
            imageAlt={mediaAlt(featured.cover)}
            isPrivate={featured.visibility === "private"}
          />
        </section>
      ) : null}

      <section aria-labelledby="all-stories">
        <HubHeading
          id="all-stories"
          title={
            filtered ? plural(shown.length, "story", "stories") : "All stories"
          }
        />
        <div className="mb-10">
          <HobbyFilters
            action="/blog"
            label="Filter stories"
            active={filtered}
            fields={[
              {
                name: "year",
                label: "Year",
                value: year,
                options: yearOptions(
                  stories.map((s) => (s.locked ? s.date : s.doc.date)),
                ),
              },
              {
                name: "tag",
                label: "Tag",
                value: tag,
                options: tagOptions(open.map((doc) => doc.tags)),
              },
            ]}
          />
        </div>
        {grid.length === 0 ? (
          <HubEmpty>No stories match these filters.</HubEmpty>
        ) : (
          <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((item) =>
              item.locked ? (
                <LockedCard
                  key={item.id}
                  title={item.title}
                  meta={`Story · ${formatDate(item.date)}`}
                  next={`/blog/${item.slug}`}
                  aspect="portrait"
                />
              ) : (
                <PostCard
                  key={item.doc.id}
                  href={`/blog/${item.doc.slug}`}
                  title={item.doc.title}
                  summary={item.doc.summary}
                  meta={storyMeta(item.doc)}
                  image={mediaUrl(item.doc.cover)}
                  imageAlt={mediaAlt(item.doc.cover)}
                  aspect="portrait"
                  isPrivate={item.doc.visibility === "private"}
                />
              ),
            )}
          </div>
        )}
      </section>
    </>
  );
}

export default function StoriesIndex({
  searchParams,
}: Readonly<PageProps<"/blog">>) {
  return (
    <SectionHub
      tone="coral"
      title="Stories"
      intro="[Intro: Shan to write]"
      stats={
        <Suspense fallback={null}>
          <StoriesStats />
        </Suspense>
      }
      actions={
        <a
          href="/blog/rss.xml"
          className="border-border bg-card/70 text-muted-foreground hover:text-foreground inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm"
        >
          <Rss className="size-3.5" aria-hidden="true" />
          RSS
        </a>
      }
    >
      <Suspense fallback={<HubGridSkeleton />}>
        <StoriesBody searchParams={searchParams} />
      </Suspense>
    </SectionHub>
  );
}
