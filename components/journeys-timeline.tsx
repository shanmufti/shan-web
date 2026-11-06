import { Lock } from "lucide-react";
import Link from "next/link";

import { formatDateRange } from "@/lib/format-date";
import {
  groupByYear,
  yearAnchor,
  type JourneyRow,
} from "@/lib/journey-timeline";
import { unlockHref } from "@/lib/site-links";

import { JourneysYearNav } from "./journeys-year-nav";

function rowHref(row: JourneyRow) {
  return row.locked ? unlockHref(`/travel/${row.slug}`) : `/travel/${row.slug}`;
}

function Entry({
  row,
  side,
}: Readonly<{ row: JourneyRow; side: "left" | "right" }>) {
  const left = side === "left";
  return (
    <li
      className={`relative pl-8 md:w-1/2 md:pl-0 md:[&:not(:first-child)]:-mt-9 ${
        left ? "md:pr-8 md:text-right" : "md:ml-auto md:pl-8"
      }`}
    >
      {/* Dot on the line */}
      <span
        aria-hidden="true"
        className={`border-background bg-foreground absolute top-[1.1rem] left-[0.3125rem] size-3 rounded-full border-2 ${
          left ? "md:right-[-0.375rem] md:left-auto" : "md:left-[-0.375rem]"
        }`}
      />
      <Link
        href={rowHref(row)}
        className="group hover:bg-muted/60 block rounded-lg px-3 py-2.5 transition-colors"
      >
        <span className="meta-label text-muted-foreground block">
          {formatDateRange(row.start, row.end)}
          {row.days ? (
            <span className="opacity-60"> · {row.days} days</span>
          ) : null}
        </span>
        <span className="mt-1 block text-lg font-medium tracking-tight underline-offset-4 group-hover:underline">
          {row.title}
          {row.locked ? (
            <Lock
              className="text-muted-foreground ml-1.5 inline size-3.5 align-baseline"
              aria-label="Private"
            />
          ) : null}
        </span>
        {row.countryNames.length > 0 ? (
          <span className="text-muted-foreground mt-0.5 block text-sm">
            {row.countryNames.join(", ")}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

/**
 * Vertical timeline: one line down the page, a year marker on the line, and
 * trips branching off it newest first. On wide screens trips alternate sides
 * and overlap by half a row, so the page stays short.
 */
export function JourneysTimeline({ rows }: Readonly<{ rows: JourneyRow[] }>) {
  const years = groupByYear(rows);
  // Alternate sides across the whole page, not restarting each year.
  const offsets = years.map((_, i) =>
    years.slice(0, i).reduce((sum, y) => sum + y.rows.length, 0),
  );

  return (
    <>
      <JourneysYearNav
        years={years.map((y) => ({ year: y.year, anchor: yearAnchor(y.year) }))}
      />
      <div className="relative">
        <span
          aria-hidden="true"
          className="bg-border absolute top-3 bottom-3 left-[0.6875rem] w-px md:left-1/2"
        />
        {years.map(({ year, rows: list }, y) => (
          <section
            key={year}
            id={yearAnchor(year)}
            aria-label={String(year)}
            className="relative scroll-mt-32 pb-8"
          >
            <h2 className="relative mb-3 flex md:justify-center">
              <span className="meta-label bg-background border-border text-foreground rounded-full border px-3 py-1">
                {year}
              </span>
            </h2>
            <ol className="space-y-1 md:space-y-0">
              {list.map((row, i) => (
                <Entry
                  key={row.key}
                  row={row}
                  side={((offsets[y] ?? 0) + i) % 2 === 0 ? "left" : "right"}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
