import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { LockedCard, PostCard } from "@/components/post-card";
import { formatDate } from "@/lib/format-date";
import {
  listStories,
  mediaAlt,
  mediaUrl,
  readingMinutes,
  storyJourney,
} from "@/lib/journeys";

export const metadata: Metadata = {
  title: "Stories",
  description: "Notes from the road and under the sea.",
  alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
};

export default async function StoriesIndex() {
  const stories = await listStories();

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-10">
      <PageHeader
        eyebrow={`Stories · ${String(stories.length)}`}
        title="Stories"
        lede="Notes from the road and under the sea, written down before they fade."
      />
      <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((item) =>
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
              image={mediaUrl(item.doc.cover)}
              imageAlt={mediaAlt(item.doc.cover)}
              aspect="portrait"
            />
          ),
        )}
      </div>
      {stories.length === 0 ? (
        <p className="text-muted-foreground">Stories will appear here soon.</p>
      ) : null}
    </div>
  );
}
