import Link from "next/link";

const links = [
  { href: "/travel", label: "Trips" },
  { href: "/travel/map", label: "Map" },
  { href: "/travel/packing", label: "Packing" },
];

export function TravelSubnav({ current }: Readonly<{ current?: string }>) {
  return (
    <nav className="mt-4 flex flex-wrap gap-4 text-sm">
      {links.map((link) => {
        const active = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "text-foreground font-medium"
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
