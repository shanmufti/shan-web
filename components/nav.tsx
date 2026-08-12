import Link from "next/link";

const links = [
  { href: "/blog", label: "Blog" },
  { href: "/diving", label: "Diving" },
  { href: "/travel", label: "Travel" },
  { href: "/tech", label: "Tech" },
];

export function Nav() {
  return (
    <header className="border-border border-b">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-heading text-sm font-semibold">
          Shan Mufti
        </Link>
        <ul className="text-muted-foreground flex gap-6 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
