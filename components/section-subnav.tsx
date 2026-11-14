import Link from "next/link";
import { Suspense } from "react";

import { currentViewer, getSectionModes } from "@/lib/site-access";
import { canView, type Viewer } from "@/lib/site-access-rules";
import type { SectionKey } from "@/lib/site-sections";

interface SubnavLink {
  href: string;
  label: string;
  /** Section that gates the link (lib/site-sections.ts); omit when open. */
  sectionKey?: SectionKey;
}

const TRAVEL_LINKS: SubnavLink[] = [
  { href: "/travel", label: "Journeys" },
  { href: "/travel/map", label: "Map" },
  { href: "/travel/packing", label: "Packing", sectionKey: "packing" },
];

const DIVING_LINKS: SubnavLink[] = [
  { href: "/diving/logs", label: "Logs" },
  { href: "/diving/skills", label: "Skills" },
  { href: "/diving/gear", label: "Gear" },
  { href: "/diving/resources", label: "Resources" },
];

/** Row of section links (pills) under a page title; `current` is filled. */
export function SectionSubnav({
  links,
  current,
}: Readonly<{ links: SubnavLink[]; current?: string | undefined }>) {
  return (
    <nav aria-label="Section" className="mt-8 flex flex-wrap gap-2 text-sm">
      {links.map((link) => {
        const active = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-9 items-center rounded-full border px-4 transition-colors ${
              active
                ? "bg-foreground text-background border-foreground"
                : "border-border bg-card/70 text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

async function GatedSubnav({
  links,
  current,
  viewer,
}: Readonly<{
  links: SubnavLink[];
  current?: string | undefined;
  /** Omit to read the visitor's cookies (call inside <Suspense>). */
  viewer?: Viewer;
}>) {
  const [modes, who] = await Promise.all([
    getSectionModes(),
    viewer ?? currentViewer(),
  ]);
  const shown = links.filter(
    (link) => !link.sectionKey || canView(modes[link.sectionKey], who),
  );
  return <SectionSubnav links={shown} current={current} />;
}

/**
 * Travel pills. Links to sections this visitor can't open (e.g. a hidden
 * Packing section) are left out, so nobody gets a link that 404s. The
 * static shell has the anonymous view; the visitor's own streams in.
 */
export function TravelSubnav({ current }: Readonly<{ current?: string }>) {
  return (
    <Suspense
      fallback={
        <GatedSubnav
          links={TRAVEL_LINKS}
          current={current}
          viewer="anonymous"
        />
      }
    >
      <GatedSubnav links={TRAVEL_LINKS} current={current} />
    </Suspense>
  );
}

export function DivingSubnav({ current }: Readonly<{ current?: string }>) {
  return <SectionSubnav links={DIVING_LINKS} current={current} />;
}
