import Link from "next/link";

const links = [
  { href: "/travel", label: "Journeys" },
  { href: "/travel/map", label: "Map" },
  { href: "/travel/packing", label: "Packing" },
];

export function TravelSubnav({ current }: Readonly<{ current?: string }>) {
  return (
    <nav aria-label="Section" className="mt-8 flex flex-wrap gap-6 text-sm">
      {links.map((link) => {
        const active = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
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
