import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { DetailPager, type PagerItem } from "@/components/detail-pager";
import { LockedPage } from "@/components/locked-page";
import { PostCard } from "@/components/post-card";
import { ArticleBody } from "@/components/rich-text";
import { formatDate } from "@/lib/format-date";
import {
  getJourney,
  getStory,
  listStories,
  mediaAlt,
  mediaUrl,
  readingMinutes,
  storyJourney,
  type Listed,
  type StoryDoc,
} from "@/lib/journeys";
import { visibleJourneyStories } from "@/lib/journey-stories";

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

/** Stories in the same journey this visitor may see, oldest first. */
async function journeyStories(story: StoryDoc): Promise<Listed<StoryDoc>[]> {
  const parent = storyJourney(story);
  if (!parent) return [];
  const result = await getJourney(parent.slug);
  if (result.status !== "ok") return [];
  return visibleJourneyStories(result.doc.stories);
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
        locked: doc.visibility === "private",
      }
    : undefined;
}

/**
 * Previous / next story. In a journey: within the journey, in travel order.
 * Stand-alone: across all stories this visitor can read, by date.
 */
async function storyNeighbours(
  story: StoryDoc,
  inJourney: Listed<StoryDoc>[],
): Promise<{ prev?: PagerItem | undefined; next?: PagerItem | undefined }> {
  if (inJourney.length > 0) {
    const i = inJourney.findIndex((s) => !s.locked && s.doc.id === story.id);
    return {
      prev: listedLink(i > 0 ? inJourney[i - 1] : undefined),
      next: listedLink(i >= 0 ? inJourney[i + 1] : undefined),
    };
  }
  const all = (await listStories())
    .flatMap((item) => (item.locked ? [] : [item.doc]))
    .filter((doc) => !storyJourney(doc));
  // Listed newest first: older is i + 1, newer is i - 1.
  const i = all.findIndex((s) => s.id === story.id);
  return {
    prev: storyLink(i >= 0 ? all[i + 1] : undefined),
    next: storyLink(i > 0 ? all[i - 1] : undefined),
  };
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
  const inJourney = await journeyStories(story);
  const { prev, next } = await storyNeighbours(story, inJourney);
  const cover = mediaUrl(story.cover);
  const shownSlugs = new Set([story.slug, prev?.href, next?.href]);
  const more = inJourney.flatMap((item) =>
    item.locked ||
    shownSlugs.has(`/blog/${item.doc.slug}`) ||
    item.doc.slug === story.slug
      ? []
      : [item.doc],
  );

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
        <figure className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={mediaAlt(story.cover) ?? ""}
            className="h-[min(56vh,44rem)] w-full object-cover sm:h-[min(70vh,44rem)]"
          />
        </figure>
      ) : null}

      <div className="px-4 sm:px-6">
        <header className="mx-auto max-w-[680px] pt-8 sm:pt-12">
          <Breadcrumbs items={crumbs} />
          <p className="meta-label text-muted-foreground mt-8">
            {formatDate(story.date)} · {String(readingMinutes(story.body))} min
            read
            {story.location?.name ? ` · ${story.location.name}` : ""}
            {story.visibility === "private" ? " · Private" : ""}
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

        <div className="mx-auto max-w-[680px]">
          <DetailPager
            label={journey ? `More from ${journey.title}` : "More stories"}
            prev={prev}
            next={next}
            prevLabel={journey ? "Previous in this journey" : "Older story"}
            nextLabel={journey ? "Next in this journey" : "Newer story"}
          />
        </div>

        {more.length > 0 && journey ? (
          <section
            aria-labelledby="more"
            className="mx-auto mt-20 max-w-7xl lg:px-4"
          >
            <p className="eyebrow text-muted-foreground">Also from</p>
            <h2
              id="more"
              className="mt-2 text-2xl font-medium tracking-[-0.03em]"
            >
              {journey.title}
            </h2>
            <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {more.slice(0, 3).map((s) => (
                <PostCard
                  key={s.id}
                  href={`/blog/${s.slug}`}
                  title={s.title}
                  summary={s.summary}
                  meta={formatDate(s.date)}
                  image={mediaUrl(s.cover)}
                  imageAlt={mediaAlt(s.cover)}
                  aspect="portrait"
                  isPrivate={s.visibility === "private"}
                />
              ))}
            </div>
          </section>
        ) : null}
        <div className="h-20" />
      </div>
    </article>
  );
}
