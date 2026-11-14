import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type HubTone = "water" | "coral" | "kelp" | "sand";

const toneClass: Record<HubTone, string> = {
  water: "bg-tint-water",
  coral: "bg-tint-coral",
  kelp: "bg-tint-kelp",
  sand: "bg-tint-sand",
};

/** "61 journeys", "Deepest 40 m": numbers from real data, nothing invented. */
export function HubStats({ stats }: Readonly<{ stats: string[] }>) {
  if (stats.length === 0) return null;
  return (
    <ul
      aria-label="In numbers"
      className="meta-label text-muted-foreground mt-5 flex flex-wrap gap-x-2 gap-y-1"
    >
      {stats.map((stat, i) => (
        <li key={stat} className="flex items-center gap-2">
          {i > 0 ? <span aria-hidden="true">·</span> : null}
          {stat}
        </li>
      ))}
    </ul>
  );
}

/**
 * Shared top for the Stories, Tech, Diving and Journeys hubs: a tinted band
 * with a big title, a stats line, the section's sub-nav and optional actions.
 * Everything below (featured item, filters, grid) goes in `children`.
 */
export function SectionHub({
  tone,
  title,
  eyebrow,
  intro,
  stats,
  nav,
  actions,
  children,
}: Readonly<{
  tone: HubTone;
  title: string;
  eyebrow?: string | undefined;
  /** Plain intro line; use a `[Intro: Shan to write]` placeholder for now. */
  intro?: string | undefined;
  /** Stats line; pass a node (e.g. a Suspense boundary) or a list. */
  stats?: string[] | ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}>) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
      <header
        className={cn(
          "border-border texture-grain rounded-tile mt-6 border px-6 pt-10 pb-8 sm:mt-10 sm:px-10 sm:pt-14 sm:pb-10",
          toneClass[tone],
        )}
      >
        {eyebrow ? (
          <p className="eyebrow text-muted-foreground">{eyebrow}</p>
        ) : null}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <h1 className="font-heading mt-2 text-[clamp(2.75rem,7vw,5rem)] leading-[0.95] tracking-[-0.045em]">
            {title}
          </h1>
          {actions ? (
            <div className="flex flex-wrap items-center gap-3">{actions}</div>
          ) : null}
        </div>
        {intro ? (
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
            {intro}
          </p>
        ) : null}
        {Array.isArray(stats) ? <HubStats stats={stats} /> : stats}
        {nav}
      </header>
      {children}
    </div>
  );
}

/** Heading row for a block inside a hub ("Featured", "All stories"). */
export function HubHeading({
  id,
  title,
  aside,
}: Readonly<{ id: string; title: string; aside?: ReactNode }>) {
  return (
    <div className="mt-14 mb-6 flex flex-wrap items-end justify-between gap-4">
      <h2 id={id} className="text-2xl font-medium tracking-[-0.03em]">
        {title}
      </h2>
      {aside}
    </div>
  );
}

/** Placeholder grid shown while per-visitor data streams in. */
export function HubGridSkeleton({ count = 6 }: Readonly<{ count?: number }>) {
  return (
    <div
      aria-hidden="true"
      className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="bg-muted aspect-[3/2] animate-pulse rounded-2xl" />
          <div className="bg-muted mt-4 h-3 w-1/3 rounded" />
          <div className="bg-muted mt-3 h-5 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Message for an empty (or filtered-to-empty) list. */
export function HubEmpty({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="border-border text-muted-foreground rounded-2xl border border-dashed p-8 text-center">
      {children}
    </p>
  );
}

/** Segmented links that switch a hub's view (e.g. Timeline / Grid). */
export function HubViewToggle({
  label,
  options,
}: Readonly<{
  label: string;
  options: { href: string; label: string; active: boolean }[];
}>) {
  return (
    <nav
      aria-label={label}
      className="border-border bg-card inline-flex rounded-full border p-1 text-sm"
    >
      {options.map((option) => (
        <Link
          key={option.href}
          href={option.href}
          scroll={false}
          aria-current={option.active ? "page" : undefined}
          className={cn(
            "inline-flex h-8 items-center rounded-full px-4 transition-colors",
            option.active
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
