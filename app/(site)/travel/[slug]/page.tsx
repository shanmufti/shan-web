import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { DetailPager } from "@/components/detail-pager";
import {
  JourneyRouteView,
  JourneyStopList,
} from "@/components/journey-route-view";
import { JourneyPhotos } from "@/components/journey-photos";
import { JourneyPlaces } from "@/components/journey-places";
import { LockedPage } from "@/components/locked-page";
import { PageTransition, SharedCover } from "@/components/page-transition";
import { Picture } from "@/components/picture";
import { LockedCard, PostCard } from "@/components/post-card";
import { ArticleBody } from "@/components/rich-text";
import { staticSlugParams } from "@/lib/content";
import { diveSite } from "@/lib/dive-logbook";
import { formatDate, formatDateRange } from "@/lib/format-date";
import { plural, yearOf } from "@/lib/hub-filters";
import { routeStops, trackDistanceKm } from "@/lib/journey-route";
import {
  hasPrivateJoinedStory,
  journeyStoriesFor,
} from "@/lib/journey-stories";
import {
  adjacentJourneys,
  isPrivate,
  journeyCountryNames,
  journeyDays,
  journeyDoc,
  journeyDocs,
  journeyTrack,
  mediaImage,
  publicJourneys,
  readingMinutes,
  type JourneyDoc,
} from "@/lib/journeys";
import {
  hasRestrictedPlaces,
  journeyPlaceDocs,
  placesFor,
  type DestinationPlaces,
} from "@/lib/places";
import { currentViewer, hasPrivateAccess } from "@/lib/site-access";

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
  // The share image is ./opengraph-image.tsx (site image when private).
  return {
    title: journey.title,
    description: journey.summary,
    alternates: { canonical: `/travel/${journey.slug}` },
    openGraph: {
      type: "article",
      title: journey.title,
      description: journey.summary,
    },
  };
}

/** Polarsteps-style trip strip: days, distance, stops, countries. */
function TripStats({
  facts,
}: Readonly<{ facts: { label: string; value: string }[] }>) {
  return (
    <dl className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="bg-card border-border rounded-xl border px-4 py-3"
        >
          <dt className="meta-label text-muted-foreground">{fact.label}</dt>
          <dd className="mt-0.5 text-xl font-medium tracking-tight tabular-nums">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function journeyLink(doc: JourneyDoc | undefined) {
  return doc
    ? {
        href: `/travel/${doc.slug}`,
        title: doc.title,
        meta: formatDateRange(doc.startDate, doc.endDate),
      }
    : undefined;
}

/**
 * The journey's stories as a visitor with (`unlocked`) or without private
 * access sees them: a locked-out visitor gets a teaser for a private story,
 * never its summary or cover.
 */
function JourneyStories({
  journey,
  unlocked,
}: Readonly<{ journey: JourneyDoc; unlocked: boolean }>) {
  const stories = journeyStoriesFor(journey.stories, unlocked);
  if (stories.length === 0) return null;
  return (
    <section aria-labelledby="stories" className="mt-16">
      <h2 id="stories" className="text-2xl font-medium tracking-[-0.03em]">
        {plural(stories.length, "story", "stories")} from this journey
      </h2>
      <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2">
        {stories.map((item) =>
          item.locked ? (
            <LockedCard
              key={item.id}
              title={item.title}
              meta={formatDate(item.date)}
              next={`/blog/${item.slug}`}
            />
          ) : (
            <PostCard
              key={item.doc.id}
              href={`/blog/${item.doc.slug}`}
              title={item.doc.title}
              summary={item.doc.summary}
              meta={`${formatDate(item.doc.date)} · ${String(readingMinutes(item.doc.body))} min`}
              image={mediaImage(item.doc.cover, "card")}
              isPrivate={isPrivate(item.doc)}
            />
          ),
        )}
      </div>
    </section>
  );
}

async function ViewerStories({ journey }: Readonly<{ journey: JourneyDoc }>) {
  const unlocked = hasPrivateJoinedStory(journey.stories)
    ? await hasPrivateAccess()
    : false;
  return <JourneyStories journey={journey} unlocked={unlocked} />;
}

/**
 * Saved places for this visitor. Only private / "Only me" places make it
 * differ per visitor, so the cookie check runs only when there are some.
 */
async function ViewerPlaces({
  destinations,
}: Readonly<{ destinations: DestinationPlaces[] }>) {
  const viewer = hasRestrictedPlaces(destinations)
    ? await currentViewer()
    : "anonymous";
  return <JourneyPlaces destinations={placesFor(destinations, viewer)} />;
}

/** Earlier/later links among the journeys a visitor can see. */
function JourneyPager({
  journey,
  docs,
  unlocked,
}: Readonly<{ journey: JourneyDoc; docs: JourneyDoc[]; unlocked: boolean }>) {
  const { newer, older } = adjacentJourneys(
    unlocked ? docs : publicJourneys(docs),
    journey,
  );
  return (
    <DetailPager
      label="More journeys"
      prev={journeyLink(older)}
      next={journeyLink(newer)}
      prevLabel="Earlier journey"
      nextLabel="Later journey"
    />
  );
}

async function ViewerPager({
  journey,
  docs,
}: Readonly<{ journey: JourneyDoc; docs: JourneyDoc[] }>) {
  // Only private journeys make this differ per visitor.
  const unlocked = docs.some(isPrivate) ? await hasPrivateAccess() : false;
  return <JourneyPager journey={journey} docs={docs} unlocked={unlocked} />;
}

type ArticleProps = Readonly<{
  journey: JourneyDoc;
  docs: JourneyDoc[];
  places: DestinationPlaces[];
}>;

function JourneyArticle({ journey, docs, places }: ArticleProps) {
  const cover = mediaImage(journey.cover);
  const countries = journeyCountryNames(journey);
  const stops = routeStops(journey);
  const track = journeyTrack(journey);
  const dives = (journey.relatedDiveLogs ?? []).filter(
    (d) => typeof d === "object",
  );
  const days = journeyDays(journey);
  const km = trackDistanceKm(track);
  const year = yearOf(journey.startDate);

  const facts = [
    ...(days ? [{ label: "Days", value: String(days) }] : []),
    ...(km
      ? [{ label: "Distance", value: `${km.toLocaleString("en-US")} km` }]
      : []),
    { label: "Stops", value: String(Math.max(stops.length, 1)) },
    {
      label: countries.length === 1 ? "Country" : "Countries",
      value: String(countries.length),
    },
  ];

  return (
    <article>
      <JourneyRouteView stops={stops} track={track}>
        <header className="pt-8 sm:pt-12">
          <Breadcrumbs
            items={[
              { label: "Journeys", href: "/travel" },
              { label: year, href: `/travel?year=${year}` },
              { label: journey.title },
            ]}
          />
          <p className="meta-label text-muted-foreground mt-8">
            {formatDateRange(journey.startDate, journey.endDate)} ·{" "}
            {countries.join(", ")}
            {isPrivate(journey) ? " · Private" : ""}
          </p>
          <h1 className="font-heading mt-3 text-[clamp(2.25rem,5vw,4rem)] leading-[0.98] tracking-[-0.04em]">
            {journey.title}
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            {journey.summary}
          </p>
          <TripStats facts={facts} />
          {cover ? (
            <SharedCover href={`/travel/${journey.slug}`}>
              <Picture
                image={cover}
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
                className="mt-8 aspect-[3/2] w-full rounded-2xl object-cover"
              />
            </SharedCover>
          ) : null}
        </header>
        <div className="mt-12">
          <ArticleBody data={journey.body} />
        </div>
        <JourneyStopList />
        <JourneyPhotos photos={journey.photos} />

        {/* Private stories differ per visitor: the shell has the anonymous view. */}
        <Suspense
          fallback={<JourneyStories journey={journey} unlocked={false} />}
        >
          <ViewerStories journey={journey} />
        </Suspense>

        {dives.length > 0 ? (
          <section aria-labelledby="dives" className="mt-16">
            <h2 id="dives" className="text-2xl font-medium tracking-[-0.03em]">
              Dives on this trip
            </h2>
            <ul className="bg-card border-border divide-border mt-6 divide-y rounded-2xl border px-5">
              {dives.map((dive) =>
                typeof dive === "object" ? (
                  <li key={dive.id}>
                    <Link
                      href={`/diving/logs/${dive.slug}`}
                      className="group flex items-baseline justify-between gap-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block underline-offset-4 group-hover:underline">
                          {dive.title}
                        </span>
                        <span className="text-muted-foreground block text-sm">
                          {diveSite(dive)}
                        </span>
                      </span>
                      <span className="meta-label text-muted-foreground shrink-0">
                        {formatDate(dive.date)}
                      </span>
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        ) : null}

        {/* Private places differ per visitor: the shell has the public ones. */}
        <Suspense
          fallback={
            <JourneyPlaces destinations={placesFor(places, "anonymous")} />
          }
        >
          <ViewerPlaces destinations={places} />
        </Suspense>

        <Suspense
          fallback={
            <JourneyPager journey={journey} docs={docs} unlocked={false} />
          }
        >
          <ViewerPager journey={journey} docs={docs} />
        </Suspense>
      </JourneyRouteView>
    </article>
  );
}

/** Private journey: checked per request, never part of the static shell. */
async function PrivateJourney({ journey, docs, places }: ArticleProps) {
  if (!(await hasPrivateAccess())) {
    return (
      <LockedPage
        kind="Journey"
        title={journey.title}
        next={`/travel/${journey.slug}`}
      />
    );
  }
  return (
    <PageTransition>
      <JourneyArticle journey={journey} docs={docs} places={places} />
    </PageTransition>
  );
}

export default async function JourneyPage({ params }: Props) {
  const { slug } = await params;
  const [journey, docs] = await Promise.all([journeyDoc(slug), journeyDocs()]);
  if (!journey) notFound();
  const places = await journeyPlaceDocs(journey.id);
  if (isPrivate(journey)) {
    return (
      <PageTransition>
        <Suspense fallback={<div className="min-h-[60svh]" />}>
          <PrivateJourney journey={journey} docs={docs} places={places} />
        </Suspense>
      </PageTransition>
    );
  }
  return (
    <PageTransition>
      <JourneyArticle journey={journey} docs={docs} places={places} />
    </PageTransition>
  );
}
