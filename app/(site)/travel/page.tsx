import type { Metadata } from "next";
import { Suspense } from "react";

import { JourneysTimeline } from "@/components/journeys-timeline";
import { PageHeader } from "@/components/page-header";
import { TravelSubnav } from "@/components/section-subnav";
import { toRows, totalDays, type JourneyRow } from "@/lib/journey-timeline";
import {
  isPrivate,
  journeyDocs,
  listJourneys,
  type JourneyDoc,
} from "@/lib/journeys";
import { hasPrivateAccess } from "@/lib/site-access";

export const metadata: Metadata = {
  title: "Journeys",
  description: "Trips, routes, and the places worth going back to.",
};

function JourneysView({ rows }: Readonly<{ rows: JourneyRow[] }>) {
  const countries = new Set(rows.flatMap((r) => r.countries)).size;
  const days = totalDays(rows.filter((r) => !r.locked));

  const stats = [
    `${String(rows.length)} journeys`,
    countries > 0 ? `${String(countries)} countries` : null,
    days > 0 ? `${days.toLocaleString("en-US")} days on the road` : null,
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow={stats.join(" · ")}
        title="Journeys"
        lede="Trips, routes, and the places worth going back to."
      >
        <TravelSubnav current="/travel" />
      </PageHeader>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">Journeys will appear here soon.</p>
      ) : (
        <JourneysTimeline rows={rows} />
      )}
    </>
  );
}

/** Reads the passcode cookie only when there are private journeys. */
async function ViewerJourneys({ docs }: Readonly<{ docs: JourneyDoc[] }>) {
  const unlocked = docs.some(isPrivate) ? await hasPrivateAccess() : false;
  return <JourneysView rows={toRows(listJourneys(docs, unlocked))} />;
}

export default async function JourneysIndex() {
  const docs = await journeyDocs();
  return (
    <div className="mx-auto max-w-4xl px-6 pb-16 lg:px-10">
      <Suspense
        fallback={<JourneysView rows={toRows(listJourneys(docs, false))} />}
      >
        <ViewerJourneys docs={docs} />
      </Suspense>
    </div>
  );
}
