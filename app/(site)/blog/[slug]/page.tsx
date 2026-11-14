import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LockedPage } from "@/components/locked-page";
import { Picture } from "@/components/picture";
import { PostCard } from "@/components/post-card";
import { ArticleBody } from "@/components/rich-text";
import { formatDate } from "@/lib/format-date";
import {
  isPrivate,
  journeyDoc,
  mediaImage,
  mediaUrl,
  readingMinutes,
  storyDoc,
  storyDocs,
  storyJourney,
  type StoryDoc,
} from "@/lib/journeys";
import { staticSlugParams } from "@/lib/content";
import { hasPrivateAccess } from "@/lib/site-access";

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

/** Published stories prerender at build; new ones render on first visit. */
export async function generateStaticParams() {
  return staticSlugParams(await storyDocs());
}

// A slug that isn't prerendered renders (and 404s) at request time.
export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = await storyDoc(slug);
  if (!story) return {};
  // Private: the title shows on the locked page anyway; nothing else leaks.
  if (isPrivate(story)) {
    return { title: story.title, robots: { index: false, follow: false } };
  }
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
  };
}

function SiblingCards({
  story,
  journey,
  siblings,
}: Readonly<{
  story: StoryDoc;
  journey: { title: string };
  siblings: StoryDoc[];
}>) {
  const others = siblings.filter((s) => s.id !== story.id).slice(0, 3);
  if (others.length === 0) return null;
  return (
    <section aria-labelledby="more" className="mt-24">
      <p className="meta-label text-muted-foreground">More from</p>
      <h2 id="more" className="font-heading mt-3 text-3xl">
        {journey.title}
      </h2>
      <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((s) => (
          <PostCard
            key={s.id}
            href={`/blog/${s.slug}`}
            title={s.title}
            summary={s.summary}
            meta={`Story · ${formatDate(s.date)}`}
            image={mediaImage(s.cover, "card")}
            aspect="portrait"
          />
        ))}
      </div>
    </section>
  );
}

function joinedStories(value: unknown): StoryDoc[] {
  const docs = (value as { docs?: unknown[] } | null | undefined)?.docs;
  return (docs ?? []).filter(
    (doc): doc is StoryDoc => typeof doc === "object" && doc !== null,
  );
}

/** Other stories in the same journey, if the visitor can see the journey. */
async function SiblingStories({ story }: Readonly<{ story: StoryDoc }>) {
  const parent = storyJourney(story);
  if (!parent) return null;
  const journey = await journeyDoc(parent.slug);
  if (!journey) return null;
  if (isPrivate(journey) && !(await hasPrivateAccess())) return null;
  return (
    <SiblingCards
      story={story}
      journey={journey}
      siblings={joinedStories(journey.stories)}
    />
  );
}

function StoryArticle({ story }: Readonly<{ story: StoryDoc }>) {
  const journey = storyJourney(story);
  const cover = mediaImage(story.cover);

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
          {isPrivate(story) ? " · Private" : ""}
        </p>
        <h1 className="font-heading mt-3 text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.02] tracking-[-0.04em]">
          {story.title}
        </h1>
        <p className="text-muted-foreground mt-5 text-lg">{story.summary}</p>
      </header>

      {cover ? (
        <Picture
          image={cover}
          sizes="(min-width: 1024px) 1024px, 100vw"
          priority
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

      {/* The parent journey may be private: then this streams per visitor. */}
      <Suspense fallback={null}>
        <SiblingStories story={story} />
      </Suspense>
    </article>
  );
}

/** Private story: checked per request, never part of the static shell. */
async function PrivateStory({ story }: Readonly<{ story: StoryDoc }>) {
  if (!(await hasPrivateAccess())) {
    return (
      <LockedPage
        kind="Story"
        title={story.title}
        next={`/blog/${story.slug}`}
      />
    );
  }
  return <StoryArticle story={story} />;
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = await storyDoc(slug);
  if (!story) notFound();
  if (isPrivate(story)) {
    return (
      <Suspense fallback={<div className="min-h-[60svh]" />}>
        <PrivateStory story={story} />
      </Suspense>
    );
  }
  return <StoryArticle story={story} />;
}
