import type { Metadata } from "next";
import { cache, Suspense } from "react";

import { HobbyFilters } from "@/components/hobby-filters";
import { JourneysTimeline } from "@/components/journeys-timeline";
import { FeaturedCard, LockedCard, PostCard } from "@/components/post-card";
import {
  HubEmpty,
  HubGridSkeleton,
  HubStats,
  HubViewToggle,
  SectionHub,
} from "@/components/section-hub";
import { TravelSubnav } from "@/components/section-subnav";
import { countryName } from "@/lib/country-names";
import { formatDateRange } from "@/lib/format-date";
import {
  param,
  plural,
  queryString,
  yearOf,
  yearOptions,
} from "@/lib/hub-filters";
import { toRows, totalDays, type JourneyRow } from "@/lib/journey-timeline";
import {
  journeyCountryNames,
  listJourneys,
  mediaAlt,
  mediaUrl,
  type JourneyDoc,
} from "@/lib/journeys";

export const metadata: Metadata = { title: "Journeys" };

const visibleJourneys = cache(listJourneys);

async function JourneysStats() {
  const rows = toRows(await visibleJourneys());
  if (rows.length === 0) return null;
  const countries = new Set(rows.flatMap((r) => r.countries)).size;
  const days = totalDays(rows.filter((r) => !r.locked));
  return (
    <HubStats
      stats={[
        plural(rows.length, "journey", "journeys"),
        ...(countries > 0 ? [plural(countries, "country", "countries")] : []),
        ...(days > 0
          ? [`${days.toLocaleString("en-US")} days on the road`]
          : []),
      ]}
    />
  );
}

function journeyMeta(row: JourneyRow) {
  return [
    formatDateRange(row.start, row.end),
    row.days ? `${String(row.days)} days` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function JourneyGrid({
  rows,
  docs,
}: Readonly<{ rows: JourneyRow[]; docs: Map<string, JourneyDoc> }>) {
  return (
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => {
        const doc = docs.get(row.key);
        if (row.locked || !doc) {
          return (
            <LockedCard
              key={row.key}
              title={row.title}
              meta={`Journey · ${formatDateRange(row.start, row.end)}`}
              next={`/travel/${row.slug}`}
            />
          );
        }
        return (
          <PostCard
            key={row.key}
            href={`/travel/${row.slug}`}
            title={row.title}
            summary={row.countryNames.join(", ")}
            meta={journeyMeta(row)}
            image={mediaUrl(doc.cover)}
            imageAlt={mediaAlt(doc.cover)}
            placeholder={row.countries.slice(0, 3).join(" ") || undefined}
            isPrivate={doc.visibility === "private"}
          />
        );
      })}
    </div>
  );
}

function JourneyList({
  rows,
  docs,
  view,
}: Readonly<{
  rows: JourneyRow[];
  docs: Map<string, JourneyDoc>;
  view: "grid" | "timeline";
}>) {
  if (rows.length === 0) {
    return <HubEmpty>No journeys match these filters.</HubEmpty>;
  }
  if (view === "grid") return <JourneyGrid rows={rows} docs={docs} />;
  return (
    <div className="mx-auto max-w-4xl">
      <JourneysTimeline rows={rows} />
    </div>
  );
}

async function JourneysBody({
  searchParams,
}: Readonly<{ searchParams: PageProps<"/travel">["searchParams"] }>) {
  const [items, params] = await Promise.all([visibleJourneys(), searchParams]);
  const rows = toRows(items);
  if (rows.length === 0) {
    return (
      <div className="mt-14">
        <HubEmpty>No journeys yet.</HubEmpty>
      </div>
    );
  }

  const view = param(params, "view") === "grid" ? "grid" : "timeline";
  const year = param(params, "year");
  const country = param(params, "country").toUpperCase();
  const filtered = Boolean(year || country);

  const docs = new Map(
    items.flatMap((item) =>
      item.locked ? [] : [[String(item.doc.id), item.doc] as const],
    ),
  );
  const shown = rows.filter(
    (row) =>
      (!year || yearOf(row.start) === year) &&
      (!country || row.countries.includes(country)),
  );
  const featured = filtered
    ? undefined
    : [...docs.values()].find((doc) => doc.featured);

  const countryCodes = [...new Set(rows.flatMap((r) => r.countries))];
  const filters = { year, country: param(params, "country") };

  return (
    <>
      {featured ? (
        <section aria-labelledby="featured-journey" className="mt-10">
          <h2 id="featured-journey" className="sr-only">
            Featured journey
          </h2>
          <FeaturedCard
            href={`/travel/${featured.slug}`}
            title={featured.title}
            summary={featured.summary}
            meta={`${formatDateRange(featured.startDate, featured.endDate)} · ${journeyCountryNames(featured).join(", ")}`}
            image={mediaUrl(featured.cover)}
            imageAlt={mediaAlt(featured.cover)}
            isPrivate={featured.visibility === "private"}
          />
        </section>
      ) : null}

      <section aria-labelledby="all-journeys">
        <div className="mt-14 mb-6 flex flex-wrap items-end justify-between gap-4">
          <h2
            id="all-journeys"
            className="text-2xl font-medium tracking-[-0.03em]"
          >
            {filtered
              ? plural(shown.length, "journey", "journeys")
              : "All journeys"}
          </h2>
          <HubViewToggle
            label="Journeys view"
            options={[
              {
                label: "Timeline",
                href: `/travel${queryString(filters)}`,
                active: view === "timeline",
              },
              {
                label: "Grid",
                href: `/travel${queryString({ view: "grid", ...filters })}`,
                active: view === "grid",
              },
            ]}
          />
        </div>
        <div className="mb-10">
          <HobbyFilters
            action="/travel"
            label="Filter journeys"
            keep={view === "grid" ? { view: "grid" } : undefined}
            active={filtered}
            fields={[
              {
                name: "year",
                label: "Year",
                value: year,
                options: yearOptions(rows.map((r) => r.start)),
              },
              {
                name: "country",
                label: "Country",
                value: country,
                options: countryCodes
                  .map((code) => ({ value: code, label: countryName(code) }))
                  .sort((a, b) => a.label.localeCompare(b.label)),
              },
            ]}
          />
        </div>
        <JourneyList
          rows={
            view === "grid" && featured
              ? shown.filter((row) => row.key !== String(featured.id))
              : shown
          }
          docs={docs}
          view={view}
        />
      </section>
    </>
  );
}

export default function JourneysIndex({
  searchParams,
}: Readonly<PageProps<"/travel">>) {
  return (
    <SectionHub
      tone="sand"
      title="Journeys"
      intro="[Intro: Shan to write]"
      stats={
        <Suspense fallback={null}>
          <JourneysStats />
        </Suspense>
      }
      nav={<TravelSubnav current="/travel" />}
    >
      <Suspense fallback={<HubGridSkeleton />}>
        <JourneysBody searchParams={searchParams} />
      </Suspense>
    </SectionHub>
  );
}
