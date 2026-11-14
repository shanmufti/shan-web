import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { DetailPager } from "@/components/detail-pager";
import {
  JourneyRouteView,
  JourneyStopList,
} from "@/components/journey-route-view";
import { LockedPage } from "@/components/locked-page";
import { LockedCard, PostCard } from "@/components/post-card";
import { ArticleBody } from "@/components/rich-text";
import { diveSite } from "@/lib/dive-logbook";
import { formatDate, formatDateRange } from "@/lib/format-date";
import { plural, yearOf } from "@/lib/hub-filters";
import { routeStops, trackDistanceKm } from "@/lib/journey-route";
import { visibleJourneyStories } from "@/lib/journey-stories";
import {
  adjacentJourneys,
  getJourney,
  journeyCountryNames,
  journeyDays,
  journeyTrack,
  mediaAlt,
  mediaUrl,
  readingMinutes,
  type JourneyDoc,
} from "@/lib/journeys";

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getJourney(slug);
  if (result.status === "missing") return {};
  if (result.status === "locked") {
    return { title: result.title, robots: { index: false, follow: false } };
  }
  const journey = result.doc;
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
    ...(journey.visibility === "private"
      ? { robots: { index: false, follow: false } }
      : {}),
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

export default async function JourneyPage({ params }: Props) {
  const { slug } = await params;
  const result = await getJourney(slug);
  if (result.status === "missing") notFound();
  if (result.status === "locked") {
    return (
      <LockedPage
        kind="Journey"
        title={result.title}
        next={`/travel/${slug}`}
      />
    );
  }

  const journey = result.doc;
  const { newer, older } = await adjacentJourneys(journey);
  const cover = mediaUrl(journey.cover);
  const countries = journeyCountryNames(journey);
  const stops = routeStops(journey);
  const track = journeyTrack(journey);
  const stories = await visibleJourneyStories(journey.stories);
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

  const header = (
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
        {journey.visibility === "private" ? " · Private" : ""}
      </p>
      <h1 className="font-heading mt-3 text-[clamp(2.25rem,5vw,4rem)] leading-[0.98] tracking-[-0.04em]">
        {journey.title}
      </h1>
      <p className="text-muted-foreground mt-4 text-lg">{journey.summary}</p>
      <TripStats facts={facts} />
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt={mediaAlt(journey.cover) ?? ""}
          className="mt-8 aspect-[3/2] w-full rounded-2xl object-cover"
        />
      ) : null}
    </header>
  );

  const after = (
    <>
      {stories.length > 0 ? (
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
                  image={mediaUrl(item.doc.cover)}
                  imageAlt={mediaAlt(item.doc.cover)}
                  isPrivate={item.doc.visibility === "private"}
                />
              ),
            )}
          </div>
        </section>
      ) : null}

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

      <DetailPager
        label="More journeys"
        prev={journeyLink(older)}
        next={journeyLink(newer)}
        prevLabel="Earlier journey"
        nextLabel="Later journey"
      />
    </>
  );

  return (
    <article>
      <JourneyRouteView stops={stops} track={track}>
        {header}
        <div className="mt-12">
          <ArticleBody data={journey.body} />
        </div>
        <JourneyStopList />
        {after}
      </JourneyRouteView>
    </article>
  );
}
