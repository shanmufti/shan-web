import config from "@payload-config";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getPayload } from "payload";
import { Suspense } from "react";

import { CallPlanner } from "@/components/call-planner";
import { PageHeader } from "@/components/page-header";
import { isValidTimeZone } from "@/lib/call-planner";
import { canViewSection } from "@/lib/site-access";

export const metadata: Metadata = {
  title: "Call times",
  robots: { index: false, follow: false },
};

function clampHour(value: unknown, fallback: number, max: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? Math.min(value, max)
    : fallback;
}

/** Per request: the people list is private to the section's viewers. */
async function Planner() {
  await connection();
  // The proxy already sends visitors without access to /unlock or a 404.
  if (!(await canViewSection("callTimes"))) notFound();
  const payload = await getPayload({ config });
  const data = await payload.findGlobal({
    slug: "call-planner",
    depth: 0,
    overrideAccess: true,
  });
  const people = (data.people ?? [])
    .filter((p) => isValidTimeZone(p.timeZone))
    .map((p) => ({
      name: p.name,
      city: p.city ?? null,
      timeZone: p.timeZone,
    }));
  return (
    <CallPlanner
      people={people}
      wakeStart={clampHour(data.wakeStart, 8, 23)}
      wakeEnd={clampHour(data.wakeEnd, 22, 24)}
    />
  );
}

export default function CallTimesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-8 lg:px-10">
      <PageHeader eyebrow="Tools" title="Call times">
        <p className="text-muted-foreground mt-4 max-w-2xl">
          Everyone&apos;s local time now, and the hours this week when everyone
          is awake.
        </p>
        <p className="mt-4 text-sm">
          <Link
            href="/tools"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            All tools
          </Link>
        </p>
      </PageHeader>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">Loading…</p>}
      >
        <Planner />
      </Suspense>
    </div>
  );
}
