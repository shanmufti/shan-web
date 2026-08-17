import type { Metadata } from "next";

import { CountriesMapLoader } from "@/components/countries-map-loader";
import { TravelSubnav } from "@/components/travel-subnav";
import { listVisitedCountries } from "@/lib/content";

export const metadata: Metadata = { title: "Travel map" };

export default async function TravelMapPage() {
  const countries = await listVisitedCountries();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header>
        <h1 className="font-heading text-2xl font-semibold">Travel map</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Countries visited so far.
        </p>
        <TravelSubnav current="/travel/map" />
      </header>

      <div className="mt-8">
        <CountriesMapLoader
          visitedCountries={countries.map((c) => ({
            country: c.country,
            yearsVisited: c.yearsVisited ?? null,
            note: c.note ?? null,
          }))}
        />
      </div>

      {countries.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">
          No countries logged yet.
        </p>
      ) : null}
    </div>
  );
}
