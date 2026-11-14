import { Rss } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { HobbyFilters } from "@/components/hobby-filters";
import { FeaturedCard, LockedCard, PostCard } from "@/components/post-card";
import {
  HubEmpty,
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
  type SearchParamsRecord,
} from "@/lib/hub-filters";
import {
  isPrivate,
  listStories,
  mediaImage,
  readingMinutes,
  storyDocs,
  storyJourney,
  type Listed,
  type StoryDoc,
} from "@/lib/journeys";
import { hasPrivateAccess } from "@/lib/site-access";

export const metadata: Metadata = {
  title: "Stories",
  alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
};

type Stories = Listed<StoryDoc>[];

function storyMeta(doc: StoryDoc) {
  return [
    formatDate(doc.date),
    storyJourney(doc)?.title,
    `${String(readingMinutes(doc.body))} min`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function StoriesStats({ stories }: Readonly<{ stories: Stories }>) {
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

function StoriesBody({
  stories,
  params,
}: Readonly<{ stories: Stories; params: SearchParamsRecord }>) {
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
            image={mediaImage(featured.cover, "card")}
            priority
            isPrivate={isPrivate(featured)}
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
            {grid.map((item, index) =>
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
                  image={mediaImage(item.doc.cover, "card")}
                  aspect="portrait"
                  priority={!featured && index < 3}
                  isPrivate={isPrivate(item.doc)}
                />
              ),
            )}
          </div>
        )}
      </section>
    </>
  );
}

/**
 * The passcode cookie is only read when there are private stories; the
 * filters come from the URL. Both happen at request time, inside Suspense.
 */
async function viewerStories(docs: StoryDoc[]): Promise<Stories> {
  const unlocked = docs.some(isPrivate) ? await hasPrivateAccess() : false;
  return listStories(docs, unlocked);
}

async function ViewerStats({ docs }: Readonly<{ docs: StoryDoc[] }>) {
  return <StoriesStats stories={await viewerStories(docs)} />;
}

async function ViewerBody({
  docs,
  searchParams,
}: Readonly<{
  docs: StoryDoc[];
  searchParams: PageProps<"/blog">["searchParams"];
}>) {
  const [stories, params] = await Promise.all([
    viewerStories(docs),
    searchParams,
  ]);
  return <StoriesBody stories={stories} params={params} />;
}

export default async function StoriesIndex({
  searchParams,
}: Readonly<PageProps<"/blog">>) {
  const docs = await storyDocs();
  // The static shell shows what an anonymous visitor sees, unfiltered.
  const anonymous = listStories(docs, false);
  return (
    <SectionHub
      tone="coral"
      title="Stories"
      intro="[Intro: Shan to write]"
      stats={
        <Suspense fallback={<StoriesStats stories={anonymous} />}>
          <ViewerStats docs={docs} />
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
      <Suspense fallback={<StoriesBody stories={anonymous} params={{}} />}>
        <ViewerBody docs={docs} searchParams={searchParams} />
      </Suspense>
    </SectionHub>
  );
}
