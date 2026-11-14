import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LockedPage } from "@/components/locked-page";
import { Picture } from "@/components/picture";
import { PostCard } from "@/components/post-card";
import { ArticleBody } from "@/components/rich-text";
import { RouteMapLoader } from "@/components/route-map-loader";
import {
  formatDate,
  formatDateRange,
  formatMonthYear,
} from "@/lib/format-date";
import {
  adjacentJourneys,
  isPrivate,
  journeyCountryNames,
  journeyDays,
  journeyDoc,
  journeyDocs,
  journeyStops,
  journeyTrack,
  mediaImage,
  mediaUrl,
  readingMinutes,
  publicJourneys,
  type JourneyDoc,
  type StoryDoc,
} from "@/lib/journeys";
import { staticSlugParams } from "@/lib/content";
import { hasPrivateAccess } from "@/lib/site-access";

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

/** Published journeys prerender at build; new ones render on first visit. */
export async function generateStaticParams() {
  return staticSlugParams(await journeyDocs());
}

// A slug that isn't prerendered renders (and 404s) at request time.
export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const journey = await journeyDoc(slug);
  if (!journey) return {};
  // Private: the title shows on the locked page anyway; nothing else leaks.
  if (isPrivate(journey)) {
    return { title: journey.title, robots: { index: false, follow: false } };
  }
  const image = mediaUrl(journey.cover);
  return {
    title: journey.title,
    description: journey.summary,
    alternates: { canonical: `/travel/${journey.slug}` },
    openGraph: {
      type: "article",
      title: journey.title,
      description: journey.summary,
      images: [image ?? "/opengraph-image"],
    },
  };
}

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="border-border border-t pt-3">
      <dt className="meta-label text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[0.95rem] tabular-nums">{value}</dd>
    </div>
  );
}

function storyList(value: unknown): StoryDoc[] {
  if (!value || typeof value !== "object") return [];
  const docs = (value as { docs?: unknown[] }).docs ?? [];
  return docs.filter(
    (doc): doc is StoryDoc => typeof doc === "object" && doc !== null,
  );
}

function JourneyFacts({
  journey,
  countries,
  stops,
  dives,
  stories,
}: Readonly<{
  journey: JourneyDoc;
  countries: string[];
  stops: number;
  dives: number;
  stories: number;
}>) {
  const days = journeyDays(journey);
  const when = journey.endDate
    ? `${formatMonthYear(journey.startDate)} – ${formatMonthYear(journey.endDate)}`
    : formatDate(journey.startDate);
  const facts: [string, string][] = [
    ["When", when],
    ...(days ? [["Days", String(days)] as [string, string]] : []),
    [countries.length === 1 ? "Country" : "Countries", countries.join(", ")],
    ...(stops > 1 ? [["Stops", String(stops)] as [string, string]] : []),
    ...(dives > 0 ? [["Dives", String(dives)] as [string, string]] : []),
    ...(stories > 0 ? [["Stories", String(stories)] as [string, string]] : []),
  ];
  return (
    <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
      {facts.map(([label, value]) => (
        <Fact key={label} label={label} value={value} />
      ))}
    </dl>
  );
}

function PagerLink({
  journey,
  direction,
}: Readonly<{ journey: JourneyDoc; direction: "Earlier" | "Later" }>) {
  return (
    <Link
      href={`/travel/${journey.slug}`}
      className={direction === "Later" ? "group sm:text-right" : "group"}
    >
      <span className="meta-label text-muted-foreground inline-flex items-center gap-1.5">
        {direction === "Earlier" ? (
          <ArrowLeft className="size-3.5" aria-hidden="true" />
        ) : null}
        {direction}
        {direction === "Later" ? (
          <ArrowRight className="size-3.5" aria-hidden="true" />
        ) : null}
      </span>
      <span className="mt-2 block text-lg font-medium tracking-tight underline-offset-4 group-hover:underline">
        {journey.title}
      </span>
    </Link>
  );
}

function JourneyPager({
  older,
  newer,
}: Readonly<{
  older?: JourneyDoc | undefined;
  newer?: JourneyDoc | undefined;
}>) {
  if (!older && !newer) return null;
  return (
    <nav
      aria-label="More journeys"
      className="border-border mt-24 grid gap-6 border-t pt-8 sm:grid-cols-2"
    >
      {older ? <PagerLink journey={older} direction="Earlier" /> : <span />}
      {newer ? <PagerLink journey={newer} direction="Later" /> : null}
    </nav>
  );
}

/** Earlier/later links among the journeys this visitor can see. */
async function ViewerPager({ journey }: Readonly<{ journey: JourneyDoc }>) {
  const docs = await journeyDocs();
  // Only private journeys make this differ per visitor.
  const unlocked = docs.some(isPrivate) ? await hasPrivateAccess() : false;
  const { newer, older } = adjacentJourneys(
    unlocked ? docs : publicJourneys(docs),
    journey,
  );
  return <JourneyPager older={older} newer={newer} />;
}

function JourneyArticle({ journey }: Readonly<{ journey: JourneyDoc }>) {
  const cover = mediaImage(journey.cover);
  const countries = journeyCountryNames(journey);
  const stops = journeyStops(journey);
  const track = journeyTrack(journey);
  const stories = storyList(journey.stories);
  const dives = (journey.relatedDiveLogs ?? []).filter(
    (d) => typeof d === "object",
  );

  return (
    <article className="mx-auto max-w-7xl px-6 lg:px-10">
      <header className="pt-12 sm:pt-20">
        <Link
          href="/travel"
          className="meta-label text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Journeys
        </Link>
        <p className="meta-label text-muted-foreground mt-8">
          Journey · {formatDateRange(journey.startDate, journey.endDate)} ·{" "}
          {countries.join(", ")}
          {journey.visibility === "private" ? " · Private" : ""}
        </p>
        <h1 className="font-heading mt-3 max-w-4xl text-[clamp(2.5rem,6vw,5rem)] leading-[0.98] tracking-[-0.04em]">
          {journey.title}
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
          {journey.summary}
        </p>
      </header>

      {cover ? (
        <Picture
          image={cover}
          sizes="(min-width: 1280px) 1200px, 100vw"
          priority
          className="mt-12 aspect-[21/9] w-full rounded-md object-cover"
        />
      ) : null}

      <JourneyFacts
        journey={journey}
        countries={countries}
        stops={stops.length}
        dives={dives.length}
        stories={stories.length}
      />

      <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)] lg:gap-16">
        <ArticleBody data={journey.body} />

        {stops.length > 0 ? (
          <aside
            aria-label="Route"
            className="lg:sticky lg:top-20 lg:self-start"
          >
            <div className="border-border aspect-[4/3] overflow-hidden rounded-md border">
              <RouteMapLoader stops={stops} track={track} />
            </div>
            {stops.length > 1 ? (
              <ol className="mt-4 space-y-1.5">
                {stops.map((stop, index) => (
                  <li
                    key={`${stop.name}-${String(index)}`}
                    className="flex gap-3 text-sm"
                  >
                    <span className="meta-label text-muted-foreground w-6">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {stop.name}
                  </li>
                ))}
              </ol>
            ) : null}
          </aside>
        ) : null}
      </div>

      {stories.length > 0 ? (
        <section aria-labelledby="stories" className="mt-24">
          <p className="meta-label text-muted-foreground">From this journey</p>
          <h2 id="stories" className="font-heading mt-3 text-3xl">
            Stories
          </h2>
          <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {/* Visitors here already passed the journey's gate, so private
                stories show in full; the story page still checks on its own. */}
            {stories.map((story) => (
              <PostCard
                key={story.id}
                href={`/blog/${story.slug}`}
                title={story.title}
                summary={story.summary}
                meta={`Story · ${formatDate(story.date)} · ${String(readingMinutes(story.body))} min${story.visibility === "private" ? " · Private" : ""}`}
                image={mediaImage(story.cover, "card")}
                aspect="portrait"
              />
            ))}
          </div>
        </section>
      ) : null}

      {dives.length > 0 ? (
        <section aria-labelledby="dives" className="mt-24">
          <p className="meta-label text-muted-foreground">
            Logged on this trip
          </p>
          <h2 id="dives" className="font-heading mt-3 text-3xl">
            Dives
          </h2>
          <ul className="divide-border border-border mt-6 divide-y border-y">
            {dives.map((dive) =>
              typeof dive === "object" ? (
                <li key={dive.id}>
                  <Link
                    href={`/diving/logs/${dive.slug}`}
                    className="group flex items-baseline justify-between gap-4 py-3"
                  >
                    <span className="underline-offset-4 group-hover:underline">
                      {dive.title}
                    </span>
                    <span className="meta-label text-muted-foreground">
                      {formatDate(dive.date)}
                    </span>
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      ) : null}

      {/* Static unless private journeys exist; then it streams per visitor. */}
      <Suspense fallback={null}>
        <ViewerPager journey={journey} />
      </Suspense>
    </article>
  );
}

/** Private journey: checked per request, never part of the static shell. */
async function PrivateJourney({ journey }: Readonly<{ journey: JourneyDoc }>) {
  if (!(await hasPrivateAccess())) {
    return (
      <LockedPage
        kind="Journey"
        title={journey.title}
        next={`/travel/${journey.slug}`}
      />
    );
  }
  return <JourneyArticle journey={journey} />;
}

export default async function JourneyPage({ params }: Props) {
  const { slug } = await params;
  const journey = await journeyDoc(slug);
  if (!journey) notFound();
  if (isPrivate(journey)) {
    return (
      <Suspense fallback={<div className="min-h-[60svh]" />}>
        <PrivateJourney journey={journey} />
      </Suspense>
    );
  }
  return <JourneyArticle journey={journey} />;
}
