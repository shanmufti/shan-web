import Link from "next/link";

import { navLinks } from "@/lib/site-access";

export async function Footer() {
  const links = await navLinks();
  const showMap = links.some((link) => link.href === "/travel");

  // Nothing open to this visitor: keep the footer to one quiet line.
  if (links.length === 0) {
    return (
      <footer className="border-border mt-16 border-t">
        <p className="meta-label text-muted-foreground mx-auto max-w-7xl px-6 py-5 lg:px-10">
          © {new Date().getFullYear()} Shan Mufti
        </p>
      </footer>
    );
  }

  return (
    <footer className="border-border mt-32 border-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:px-10">
        <div>
          <p className="font-heading text-2xl">Shan Mufti</p>
          <p className="text-muted-foreground mt-3 max-w-sm text-sm">
            Divemaster, traveler, and engineer. Field notes from the road and
            under the sea.
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="meta-label text-muted-foreground">Explore</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {showMap ? (
              <li>
                <Link
                  href="/travel/map"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Map
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
      </div>
      <div className="border-border border-t">
        <p className="meta-label text-muted-foreground mx-auto max-w-7xl px-6 py-5 lg:px-10">
          © {new Date().getFullYear()} Shan Mufti
        </p>
      </div>
    </footer>
  );
}
