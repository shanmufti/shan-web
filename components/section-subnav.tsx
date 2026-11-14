import Link from "next/link";

interface SubnavLink {
  href: string;
  label: string;
}

const TRAVEL_LINKS: SubnavLink[] = [
  { href: "/travel", label: "Journeys" },
  { href: "/travel/map", label: "Map" },
  { href: "/travel/packing", label: "Packing" },
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

export function TravelSubnav({ current }: Readonly<{ current?: string }>) {
  return <SectionSubnav links={TRAVEL_LINKS} current={current} />;
}

export function DivingSubnav({ current }: Readonly<{ current?: string }>) {
  return <SectionSubnav links={DIVING_LINKS} current={current} />;
}
