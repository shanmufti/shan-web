import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { LockedCard, PostCard } from "@/components/post-card";
import { formatDate } from "@/lib/format-date";
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
  description: "Notes from the road and under the sea.",
  alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
};

function StoriesView({ stories }: Readonly<{ stories: Listed<StoryDoc>[] }>) {
  return (
    <>
      <PageHeader
        eyebrow={`Stories · ${String(stories.length)}`}
        title="Stories"
        lede="Notes from the road and under the sea, written down before they fade."
      />
      <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((item, index) =>
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
              meta={[
                "Story",
                formatDate(item.doc.date),
                storyJourney(item.doc)?.title,
                `${String(readingMinutes(item.doc.body))} min`,
              ]
                .filter(Boolean)
                .join(" · ")}
              image={mediaImage(item.doc.cover, "card")}
              aspect="portrait"
              priority={index < 3}
            />
          ),
        )}
      </div>
      {stories.length === 0 ? (
        <p className="text-muted-foreground">Stories will appear here soon.</p>
      ) : null}
    </>
  );
}

/**
 * Private stories depend on who's looking, so only then is the passcode
 * cookie read (at request time). Without private stories the whole list is
 * part of the static shell.
 */
async function ViewerStories({ docs }: Readonly<{ docs: StoryDoc[] }>) {
  const unlocked = docs.some(isPrivate) ? await hasPrivateAccess() : false;
  return <StoriesView stories={listStories(docs, unlocked)} />;
}

export default async function StoriesIndex() {
  const docs = await storyDocs();
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-10">
      <Suspense fallback={<StoriesView stories={listStories(docs, false)} />}>
        <ViewerStories docs={docs} />
      </Suspense>
    </div>
  );
}
