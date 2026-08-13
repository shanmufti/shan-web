import type { Metadata } from "next";
import Link from "next/link";

import { DiveLogRow } from "@/components/dive-log";
import { DivingSubnav } from "@/components/diving-subnav";
import { LogDiveButton } from "@/components/log-dive-button";
import { diveMaxDepth, listPublished } from "@/lib/content";
import { formatDate } from "@/lib/format-date";

export const metadata: Metadata = { title: "Diving" };

export default async function DivingHub() {
  const dives = await listPublished("diving", { limit: 100 });
  const recent = dives.slice(0, 6);

  const deepest = dives.reduce<number | null>((max, dive) => {
    const depth = diveMaxDepth(dive);
    if (depth == null) return max;
    if (max == null) return depth;
    return Math.max(max, depth);
  }, null);

  const latest = dives[0];
  const latestSite = latest?.siteName ?? latest?.location.name ?? null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Diving
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Cold-water logs, skills, kit, and notes from the water.
        </p>
        <DivingSubnav current="/diving" />
      </header>

      <div className="text-muted-foreground mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span>
          <span className="text-foreground font-medium">{dives.length}</span>{" "}
          dives
        </span>
        {deepest != null ? (
          <span>
            Deepest{" "}
            <span className="text-foreground font-medium">
              {String(deepest)} m
            </span>
          </span>
        ) : null}
        {latestSite ? (
          <span>
            Latest{" "}
            <span className="text-foreground font-medium">{latestSite}</span>
          </span>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <LogDiveButton />
        <Link
          href="/diving/logs"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          View all logs
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="font-heading text-lg font-semibold">Recent dives</h2>
        <div className="mt-2">
          {recent.map((dive) => (
            <Link
              key={dive.slug}
              href={`/diving/logs/${dive.slug}`}
              className="block hover:opacity-80"
            >
              <DiveLogRow dive={dive} />
            </Link>
          ))}
          {recent.length === 0 ? (
            <p className="text-muted-foreground mt-4 text-sm">
              No dive logs yet.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-14 grid gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-heading text-base font-semibold">Skills</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Track buoyancy, navigation, and rescue practice over time.
          </p>
          <Link
            href="/diving/skills"
            className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
          >
            View skills
          </Link>
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold">Gear</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Owned kit, research list, and named equipment configs.
          </p>
          <Link
            href="/diving/gear"
            className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
          >
            View gear
          </Link>
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold">Resources</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Curated videos and articles for dive learning.
          </p>
          <Link
            href="/diving/resources"
            className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
          >
            View resources
          </Link>
        </div>
      </section>

      {latest ? (
        <p className="text-muted-foreground mt-12 text-xs">
          Last logged {formatDate(latest.date)}
        </p>
      ) : null}
    </div>
  );
}
