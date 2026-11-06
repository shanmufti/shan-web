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

/** Row of section links under a page title; `current` is underlined. */
function SectionSubnav({
  links,
  current,
}: Readonly<{ links: SubnavLink[]; current?: string | undefined }>) {
  return (
    <nav aria-label="Section" className="mt-8 flex flex-wrap gap-6 text-sm">
      {links.map((link) => {
        const active = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "text-foreground underline decoration-1 underline-offset-[6px]"
                : "text-muted-foreground hover:text-foreground"
            }
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
