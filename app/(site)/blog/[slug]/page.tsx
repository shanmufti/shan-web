import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { DetailPager, type PagerItem } from "@/components/detail-pager";
import { LockedPage } from "@/components/locked-page";
import { PageTransition, SharedCover } from "@/components/page-transition";
import { Picture } from "@/components/picture";
import { PostCard } from "@/components/post-card";
import { ArticleBody } from "@/components/rich-text";
import { staticSlugParams } from "@/lib/content";
import { formatDate } from "@/lib/format-date";
import {
  hasPrivateJoinedStory,
  journeyStoriesFor,
} from "@/lib/journey-stories";
import {
  isPrivate,
  journeyDoc,
  listStories,
  mediaImage,
  readingMinutes,
  storyDoc,
  storyDocs,
  storyJourney,
  type JourneyDoc,
  type Listed,
  type StoryDoc,
} from "@/lib/journeys";
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
  // The share image is ./opengraph-image.tsx (site image when private).
  return {
    title: story.title,
    description: story.summary,
    alternates: { canonical: `/blog/${story.slug}` },
    openGraph: {
      type: "article",
      title: story.title,
      description: story.summary,
      publishedTime: story.date,
    },
  };
}

function listedLink(item: Listed<StoryDoc> | undefined): PagerItem | undefined {
  if (!item) return undefined;
  if (item.locked) {
    return {
      href: `/blog/${item.slug}`,
      title: item.title,
      meta: formatDate(item.date),
      locked: true,
    };
  }
  return storyLink(item.doc);
}

function storyLink(doc: StoryDoc | undefined): PagerItem | undefined {
  return doc
    ? {
        href: `/blog/${doc.slug}`,
        title: doc.title,
        meta: formatDate(doc.date),
        locked: isPrivate(doc),
      }
    : undefined;
}

interface FooterData {
  story: StoryDoc;
  /** The parent journey (may be private), if any. */
  journey: JourneyDoc | null;
  /** Every published story, for stand-alone neighbours. */
  docs: StoryDoc[];
}

/**
 * Previous / next story. In a journey: within the journey, in travel order.
 * Stand-alone: across all stories this visitor can read, by date.
 */
function storyNeighbours(
  story: StoryDoc,
  inJourney: Listed<StoryDoc>[],
  docs: StoryDoc[],
  unlocked: boolean,
): { prev?: PagerItem | undefined; next?: PagerItem | undefined } {
  if (inJourney.length > 0) {
    const i = inJourney.findIndex((s) => !s.locked && s.doc.id === story.id);
    return {
      prev: listedLink(i > 0 ? inJourney[i - 1] : undefined),
      next: listedLink(i >= 0 ? inJourney[i + 1] : undefined),
    };
  }
  const all = listStories(docs, unlocked)
    .flatMap((item) => (item.locked ? [] : [item.doc]))
    .filter((doc) => !storyJourney(doc));
  // Listed newest first: older is i + 1, newer is i - 1.
  const i = all.findIndex((s) => s.id === story.id);
  return {
    prev: storyLink(i >= 0 ? all[i + 1] : undefined),
    next: storyLink(i > 0 ? all[i - 1] : undefined),
  };
}

/**
 * Previous / next story and more from the journey, as a visitor with
 * (`unlocked`) or without private access sees them.
 */
function StoryFooter({
  story,
  journey,
  docs,
  unlocked,
}: Readonly<FooterData & { unlocked: boolean }>) {
  const parent = storyJourney(story);
  const inJourney =
    journey && (!isPrivate(journey) || unlocked)
      ? journeyStoriesFor(journey.stories, unlocked)
      : [];
  const { prev, next } = storyNeighbours(story, inJourney, docs, unlocked);

  const shownSlugs = new Set([story.slug, prev?.href, next?.href]);
  const more = inJourney.flatMap((item) =>
    item.locked ||
    shownSlugs.has(`/blog/${item.doc.slug}`) ||
    item.doc.slug === story.slug
      ? []
      : [item.doc],
  );

  return (
    <>
      <div className="mx-auto max-w-[680px]">
        <DetailPager
          label={parent ? `More from ${parent.title}` : "More stories"}
          prev={prev}
          next={next}
          prevLabel={parent ? "Previous in this journey" : "Older story"}
          nextLabel={parent ? "Next in this journey" : "Newer story"}
        />
      </div>

      {more.length > 0 && parent ? (
        <section
          aria-labelledby="more"
          className="mx-auto mt-20 max-w-7xl lg:px-4"
        >
          <p className="eyebrow text-muted-foreground">Also from</p>
          <h2
            id="more"
            className="mt-2 text-2xl font-medium tracking-[-0.03em]"
          >
            {parent.title}
          </h2>
          <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {more.slice(0, 3).map((s) => (
              <PostCard
                key={s.id}
                href={`/blog/${s.slug}`}
                title={s.title}
                summary={s.summary}
                meta={formatDate(s.date)}
                image={mediaImage(s.cover, "card")}
                aspect="portrait"
                isPrivate={isPrivate(s)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

/** Reads the passcode cookie only when something private is involved. */
async function ViewerFooter(props: Readonly<FooterData>) {
  const { journey, docs } = props;
  const involvesPrivate =
    (journey !== null &&
      (isPrivate(journey) || hasPrivateJoinedStory(journey.stories))) ||
    docs.some(isPrivate);
  const unlocked = involvesPrivate ? await hasPrivateAccess() : false;
  return <StoryFooter {...props} unlocked={unlocked} />;
}

function StoryArticle({ story, ...footer }: Readonly<FooterData>) {
  const journey = storyJourney(story);
  const cover = mediaImage(story.cover);

  const crumbs: Crumb[] = [
    { label: "Stories", href: "/blog" },
    ...(journey
      ? [{ label: journey.title, href: `/travel/${journey.slug}` }]
      : []),
    { label: story.title },
  ];

  return (
    <article>
      <div className="reading-progress" aria-hidden="true" />

      {cover ? (
        <SharedCover href={`/blog/${story.slug}`}>
          <figure className="relative">
            <Picture
              image={cover}
              sizes="100vw"
              priority
              className="h-[min(56vh,44rem)] w-full object-cover sm:h-[min(70vh,44rem)]"
            />
          </figure>
        </SharedCover>
      ) : null}

      <div className="px-4 sm:px-6">
        <header className="mx-auto max-w-[680px] pt-8 sm:pt-12">
          <Breadcrumbs items={crumbs} />
          <p className="meta-label text-muted-foreground mt-8">
            {formatDate(story.date)} · {String(readingMinutes(story.body))} min
            read
            {story.location?.name ? ` · ${story.location.name}` : ""}
            {isPrivate(story) ? " · Private" : ""}
          </p>
          <h1 className="font-heading mt-3 text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.02] tracking-[-0.04em]">
            {story.title}
          </h1>
          <p className="text-muted-foreground mt-5 text-lg">{story.summary}</p>
        </header>

        <div className="article-breakout mx-auto mt-12 max-w-[680px]">
          <ArticleBody data={story.body} />
          {story.tags && story.tags.length > 0 ? (
            <p className="meta-label text-muted-foreground mt-12">
              {story.tags.map((tag) => `#${tag}`).join("  ")}
            </p>
          ) : null}
        </div>

        {/* Neighbours may be private: the shell has the anonymous view. */}
        <Suspense
          fallback={<StoryFooter story={story} {...footer} unlocked={false} />}
        >
          <ViewerFooter story={story} {...footer} />
        </Suspense>
        <div className="h-20" />
      </div>
    </article>
  );
}

/** Private story: checked per request, never part of the static shell. */
async function PrivateStory(props: Readonly<FooterData>) {
  const { story } = props;
  if (!(await hasPrivateAccess())) {
    return (
      <LockedPage
        kind="Story"
        title={story.title}
        next={`/blog/${story.slug}`}
      />
    );
  }
  return <StoryArticle {...props} />;
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = await storyDoc(slug);
  if (!story) notFound();
  const parent = storyJourney(story);
  const [journey, docs] = await Promise.all([
    parent ? journeyDoc(parent.slug) : null,
    storyDocs(),
  ]);
  const data: FooterData = { story, journey, docs };
  if (isPrivate(story)) {
    return (
      <PageTransition>
        <Suspense fallback={<div className="min-h-[60svh]" />}>
          <PrivateStory {...data} />
        </Suspense>
      </PageTransition>
    );
  }
  return (
    <PageTransition>
      <StoryArticle {...data} />
    </PageTransition>
  );
}
