import type { Metadata } from "next";
import Link from "next/link";

import { DiveLogRow } from "@/components/dive-log";
import { DivingSubnav } from "@/components/diving-subnav";
import { LogDiveButton } from "@/components/log-dive-button";
import { listPublished } from "@/lib/content";

export const metadata: Metadata = { title: "Dive logs" };

export default async function DiveLogsPage() {
  const dives = await listPublished("diving");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header>
        <h1 className="font-heading text-2xl font-semibold">Dive logs</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Chronological record of sites, depths, and bottom time.
        </p>
        <DivingSubnav current="/diving/logs" />
      </header>

      <div className="mt-6">
        <LogDiveButton />
      </div>

      <div className="mt-8">
        {dives.map((dive) => (
          <Link
            key={dive.slug}
            href={`/diving/logs/${dive.slug}`}
            className="block hover:opacity-80"
          >
            <DiveLogRow dive={dive} />
          </Link>
        ))}
        {dives.length === 0 ? (
          <div className="mt-8 space-y-3">
            <p className="text-muted-foreground text-sm">No dive logs yet.</p>
            <LogDiveButton />
          </div>
        ) : null}
      </div>
    </div>
  );
}
