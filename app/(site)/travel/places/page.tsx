import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { BentoGrid, BentoTile } from "@/components/ui/bento";
import { countryName } from "@/lib/country-names";
import { formatMonthYear } from "@/lib/format-date";
import { listDestinations } from "@/lib/places";

export const metadata: Metadata = {
  title: "Places",
  description: "Destination pages with saved places on a map.",
};

// Per viewer (drafts and private destinations), so it renders per request.
export const instant = false;

export default async function PlacesIndex() {
  // Per viewer (drafts and private destinations): never prerendered.
  await connection();
  const { viewer, destinations } = await listDestinations();
  const places = destinations.reduce((sum, d) => sum + d.placeCount, 0);
  const eyebrow = [
    `${String(destinations.length)} ${destinations.length === 1 ? "destination" : "destinations"}`,
    places > 0 ? `${String(places)} places` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-10">
      <PageHeader eyebrow={eyebrow} title="Places">
        <Link
          href="/travel"
          className="meta-label text-muted-foreground hover:text-foreground mt-6 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Journeys
        </Link>
      </PageHeader>

      {destinations.length === 0 ? (
        <p className="text-muted-foreground max-w-2xl">
          {viewer === "owner"
            ? "No destinations yet. Export your Google Maps saved lists with Google Takeout and run scripts/import-google-maps.ts (see the README)."
            : "Destination pages will appear here."}
        </p>
      ) : (
        <BentoGrid columns={3}>
          {destinations.map((d) => (
            <BentoTile
              key={d.slug}
              href={`/travel/places/${d.slug}`}
              eyebrow={d.country ? countryName(d.country) : "Destination"}
              title={d.title}
              description={[
                `${String(d.placeCount)} ${d.placeCount === 1 ? "place" : "places"}`,
                d.firstVisit ? `since ${formatMonthYear(d.firstVisit)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            >
              {d.draft ? <Badge variant="outline">Draft</Badge> : null}
            </BentoTile>
          ))}
        </BentoGrid>
      )}
    </div>
  );
}
