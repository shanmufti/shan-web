import type { Metadata } from "next";
import Link from "next/link";
import { cache, Suspense } from "react";

import { DiveLogRow } from "@/components/dive-log";
import { HobbyFilters } from "@/components/hobby-filters";
import { LogDiveButton } from "@/components/log-dive-button";
import {
  HubEmpty,
  HubHeading,
  HubStats,
  SectionHub,
} from "@/components/section-hub";
import { DivingSubnav } from "@/components/section-subnav";
import { listPublished } from "@/lib/content";
import { diveStats } from "@/lib/dive-logbook";
import { param, plural, yearOf, yearOptions } from "@/lib/hub-filters";

export const metadata: Metadata = { title: "Dive logs" };

const allDives = cache(() => listPublished("diving", { limit: 1000 }));

async function LogsStats() {
  return <HubStats stats={diveStats(await allDives())} />;
}

async function LogsBody({
  searchParams,
}: Readonly<{ searchParams: PageProps<"/diving/logs">["searchParams"] }>) {
  const [dives, params] = await Promise.all([allDives(), searchParams]);
  if (dives.length === 0) {
    return (
      <div className="mt-14">
        <HubEmpty>No dive logs yet.</HubEmpty>
      </div>
    );
  }
  const year = param(params, "year");
  const shown = year ? dives.filter((d) => yearOf(d.date) === year) : dives;
  return (
    <section aria-labelledby="logs">
      <HubHeading
        id="logs"
        title={year ? plural(shown.length, "dive", "dives") : "All dives"}
      />
      <div className="mb-8">
        <HobbyFilters
          action="/diving/logs"
          label="Filter dives"
          active={Boolean(year)}
          fields={[
            {
              name: "year",
              label: "Year",
              value: year,
              options: yearOptions(dives.map((d) => d.date)),
            },
          ]}
        />
      </div>
      {shown.length === 0 ? (
        <HubEmpty>No dives logged in {year}.</HubEmpty>
      ) : (
        <ul className="bg-card border-border rounded-2xl border px-5 [&>li:last-child>a>div]:border-b-0">
          {shown.map((dive) => (
            <li key={dive.slug}>
              <Link
                href={`/diving/logs/${dive.slug}`}
                className="group block [&_p:first-child]:underline-offset-4 hover:[&_p:first-child]:underline"
              >
                <DiveLogRow dive={dive} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function DiveLogsPage({
  searchParams,
}: Readonly<PageProps<"/diving/logs">>) {
  return (
    <SectionHub
      tone="water"
      title="Dive logs"
      stats={
        <Suspense fallback={null}>
          <LogsStats />
        </Suspense>
      }
      nav={<DivingSubnav current="/diving/logs" />}
      actions={
        <LogDiveButton className="bg-foreground text-background inline-flex h-9 items-center rounded-full px-4 text-sm font-medium" />
      }
    >
      <Suspense fallback={null}>
        <LogsBody searchParams={searchParams} />
      </Suspense>
    </SectionHub>
  );
}
