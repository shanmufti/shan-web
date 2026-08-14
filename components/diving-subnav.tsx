import Link from "next/link";

const links = [
  { href: "/diving/logs", label: "Logs" },
  { href: "/diving/skills", label: "Skills" },
  { href: "/diving/gear", label: "Gear" },
  { href: "/diving/resources", label: "Resources" },
];

export function DivingSubnav({ current }: Readonly<{ current?: string }>) {
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
