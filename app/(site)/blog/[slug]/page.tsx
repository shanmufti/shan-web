import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LockedPage } from "@/components/locked-page";
import { PostCard } from "@/components/post-card";
import { ArticleBody } from "@/components/rich-text";
import { formatDate } from "@/lib/format-date";
import {
  getJourney,
  getStory,
  mediaAlt,
  mediaUrl,
  readingMinutes,
  storyJourney,
  type StoryDoc,
} from "@/lib/journeys";

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getStory(slug);
  if (result.status === "missing") return {};
  if (result.status === "locked") {
    return { title: result.title, robots: { index: false, follow: false } };
  }
  const story = result.doc;
  const image = mediaUrl(story.cover);
  return {
    title: story.title,
    description: story.summary,
    alternates: { canonical: `/blog/${story.slug}` },
    openGraph: {
      type: "article",
      title: story.title,
      description: story.summary,
      publishedTime: story.date,
      images: [image ?? "/opengraph-image"],
    },
    ...(story.visibility === "private"
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}

/** Other stories in the same journey, if the visitor can see the journey. */
async function siblingStories(story: StoryDoc): Promise<StoryDoc[]> {
  const parent = storyJourney(story);
  if (!parent) return [];
  const result = await getJourney(parent.slug);
  if (result.status !== "ok") return [];
  const docs = (result.doc.stories as { docs?: unknown[] } | null | undefined)
    ?.docs;
  return (docs ?? []).filter(
    (doc): doc is StoryDoc =>
      typeof doc === "object" &&
      doc !== null &&
      (doc as StoryDoc).id !== story.id,
  );
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const result = await getStory(slug);
  if (result.status === "missing") notFound();
  if (result.status === "locked") {
    return (
      <LockedPage kind="Story" title={result.title} next={`/blog/${slug}`} />
    );
  }

  const story = result.doc;
  const journey = storyJourney(story);
  const siblings = await siblingStories(story);
  const cover = mediaUrl(story.cover);

  return (
    <article className="mx-auto max-w-7xl px-6 lg:px-10">
      <header className="mx-auto max-w-[680px] pt-12 sm:pt-20">
        <Link
          href={journey ? `/travel/${journey.slug}` : "/blog"}
          className="meta-label text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {journey ? journey.title : "Stories"}
        </Link>
        <p className="meta-label text-muted-foreground mt-8">
          Story · {formatDate(story.date)} ·{" "}
          {String(readingMinutes(story.body))} min read
          {story.location?.name ? ` · ${story.location.name}` : ""}
          {story.visibility === "private" ? " · Private" : ""}
        </p>
        <h1 className="font-heading mt-3 text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.02] tracking-[-0.04em]">
          {story.title}
        </h1>
        <p className="text-muted-foreground mt-5 text-lg">{story.summary}</p>
      </header>

      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt={mediaAlt(story.cover) ?? ""}
          className="mx-auto mt-12 aspect-[3/2] w-full max-w-5xl rounded-md object-cover"
        />
      ) : null}

      <div className="mx-auto mt-12 max-w-[680px]">
        <ArticleBody data={story.body} />
        {story.tags && story.tags.length > 0 ? (
          <p className="meta-label text-muted-foreground mt-12">
            {story.tags.map((tag) => `#${tag}`).join("  ")}
          </p>
        ) : null}
      </div>

      {siblings.length > 0 && journey ? (
        <section aria-labelledby="more" className="mt-24">
          <p className="meta-label text-muted-foreground">More from</p>
          <h2 id="more" className="font-heading mt-3 text-3xl">
            {journey.title}
          </h2>
          <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {siblings.slice(0, 3).map((s) => (
              <PostCard
                key={s.id}
                href={`/blog/${s.slug}`}
                title={s.title}
                summary={s.summary}
                meta={`Story · ${formatDate(s.date)}`}
                image={mediaUrl(s.cover)}
                aspect="portrait"
              />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
