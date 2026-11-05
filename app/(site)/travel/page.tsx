import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { LockedCard, PostCard } from "@/components/post-card";
import { TravelSubnav } from "@/components/travel-subnav";
import { formatDateRange } from "@/lib/format-date";
import {
  journeyCountries,
  journeyCountryNames,
  listJourneys,
  mediaAlt,
  mediaUrl,
} from "@/lib/journeys";

export const metadata: Metadata = {
  title: "Journeys",
  description: "Trips, routes, and the places worth going back to.",
};

export default async function JourneysIndex() {
  const journeys = await listJourneys();

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-10">
      <PageHeader
        eyebrow={`Journeys · ${String(journeys.length)}`}
        title="Journeys"
        lede="Trips, routes, and the places worth going back to."
      >
        <TravelSubnav current="/travel" />
      </PageHeader>
      <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {journeys.map((item) =>
          item.locked ? (
            <LockedCard
              key={item.id}
              title={item.title}
              meta={`Journey · ${formatDateRange(item.date, item.endDate)}`}
              next={`/travel/${item.slug}`}
            />
          ) : (
            <PostCard
              key={item.doc.id}
              href={`/travel/${item.doc.slug}`}
              title={item.doc.title}
              summary={item.doc.summary}
              meta={`${formatDateRange(item.doc.startDate, item.doc.endDate)} · ${journeyCountryNames(item.doc).join(", ")}`}
              image={mediaUrl(item.doc.cover)}
              imageAlt={mediaAlt(item.doc.cover)}
              placeholder={journeyCountries(item.doc).join(" ") || undefined}
            />
          ),
        )}
      </div>
      {journeys.length === 0 ? (
        <p className="text-muted-foreground">Journeys will appear here soon.</p>
      ) : null}
    </div>
  );
}
