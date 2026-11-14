import type { Metadata } from "next";
import Link from "next/link";
import { cache, Suspense } from "react";

import { DiveLogRow } from "@/components/dive-log";
import { DiveLogbook } from "@/components/dive-logbook";
import { LogDiveButton } from "@/components/log-dive-button";
import {
  HubEmpty,
  HubHeading,
  HubStats,
  SectionHub,
} from "@/components/section-hub";
import { DivingSubnav } from "@/components/section-subnav";
import { BentoGrid, BentoTile } from "@/components/ui/bento";
import { listPublished } from "@/lib/content";
import { diveDepths, divesPerYear, diveStats } from "@/lib/dive-logbook";

export const metadata: Metadata = { title: "Diving" };

const allDives = cache(() => listPublished("diving", { limit: 1000 }));

async function DivingStats() {
  return <HubStats stats={diveStats(await allDives())} />;
}

async function DivingBody() {
  const dives = await allDives();
  const recent = dives.slice(0, 8);

  return (
    <>
      {dives.length > 0 ? (
        <section aria-labelledby="logbook">
          <HubHeading id="logbook" title="Logbook" />
          <DiveLogbook
            perYear={divesPerYear(dives)}
            depths={diveDepths(dives)}
          />
        </section>
      ) : null}

      <section aria-labelledby="recent-dives">
        <HubHeading
          id="recent-dives"
          title="Recent dives"
          aside={
            dives.length > recent.length ? (
              <Link
                href="/diving/logs"
                className="text-primary text-sm font-medium underline-offset-4 hover:underline"
              >
                All {dives.length} logs
              </Link>
            ) : null
          }
        />
        {recent.length === 0 ? (
          <HubEmpty>No dive logs yet.</HubEmpty>
        ) : (
          <ul className="bg-card border-border rounded-2xl border px-5 [&>li:last-child>a>div]:border-b-0">
            {recent.map((dive) => (
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
    </>
  );
}

export default function DivingHub() {
  return (
    <SectionHub
      tone="water"
      title="Diving"
      intro="[Intro: Shan to write]"
      stats={
        <Suspense fallback={null}>
          <DivingStats />
        </Suspense>
      }
      nav={<DivingSubnav current="/diving" />}
      actions={
        <LogDiveButton className="bg-foreground text-background inline-flex h-9 items-center rounded-full px-4 text-sm font-medium" />
      }
    >
      <Suspense fallback={null}>
        <DivingBody />
      </Suspense>

      <section aria-label="More diving" className="mt-14">
        <BentoGrid columns={3} className="auto-rows-[minmax(9rem,auto)]">
          <BentoTile
            tone="water"
            eyebrow="Practice"
            title="Skills"
            description="Buoyancy, navigation and rescue practice over time."
            href="/diving/skills"
            headingLevel={2}
          />
          <BentoTile
            eyebrow="Kit"
            title="Gear"
            description="Owned kit, research list and named equipment configs."
            href="/diving/gear"
            headingLevel={2}
          />
          <BentoTile
            tone="kelp"
            eyebrow="Learning"
            title="Resources"
            description="Videos and articles for dive learning."
            href="/diving/resources"
            headingLevel={2}
          />
        </BentoGrid>
      </section>
    </SectionHub>
  );
}
