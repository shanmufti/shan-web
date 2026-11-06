import type { Metadata } from "next";

import { JourneysTimeline } from "@/components/journeys-timeline";
import { PageHeader } from "@/components/page-header";
import { TravelSubnav } from "@/components/section-subnav";
import { toRows, totalDays } from "@/lib/journey-timeline";
import { listJourneys } from "@/lib/journeys";

export const metadata: Metadata = {
  title: "Journeys",
  description: "Trips, routes, and the places worth going back to.",
};

export default async function JourneysIndex() {
  const rows = toRows(await listJourneys());
  const countries = new Set(rows.flatMap((r) => r.countries)).size;
  const days = totalDays(rows.filter((r) => !r.locked));

  const stats = [
    `${String(rows.length)} journeys`,
    countries > 0 ? `${String(countries)} countries` : null,
    days > 0 ? `${days.toLocaleString("en-US")} days on the road` : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl px-6 pb-16 lg:px-10">
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
    </div>
  );
}
