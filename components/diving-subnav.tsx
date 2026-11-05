import Link from "next/link";

const links = [
  { href: "/diving/logs", label: "Logs" },
  { href: "/diving/skills", label: "Skills" },
  { href: "/diving/gear", label: "Gear" },
  { href: "/diving/resources", label: "Resources" },
];

export function DivingSubnav({ current }: Readonly<{ current?: string }>) {
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
