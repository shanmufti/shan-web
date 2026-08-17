"use client";

import dynamic from "next/dynamic";

import type { VisitedCountry } from "@/components/countries-map";

const CountriesMap = dynamic(
  () => import("@/components/countries-map").then((mod) => mod.CountriesMap),
  { ssr: false },
);

export function CountriesMapLoader({
  visitedCountries,
}: Readonly<{
  visitedCountries: VisitedCountry[];
}>) {
  return <CountriesMap visitedCountries={visitedCountries} />;
}
