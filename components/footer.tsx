import { Lock } from "lucide-react";
import Link from "next/link";

import { navSections } from "@/lib/site-access";

const linkClass =
  "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-sm transition-colors";

export async function Footer() {
  const sections = await navSections();
  const year = new Date().getFullYear();
  const showMap = sections.some((s) => s.href === "/travel" && !s.locked);

  return (
    <footer className="border-border bg-tint-water/60 texture-grain mt-24 border-t sm:mt-32">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-[minmax(0,1fr)_auto] sm:py-14 lg:px-10">
        <div>
          <Link
            href="/"
            className="-mx-1 rounded-md px-1 text-lg font-semibold tracking-[-0.02em]"
          >
            smufti
          </Link>
          <p className="text-muted-foreground mt-3 hidden text-sm md:block">
            Press{" "}
            <kbd className="border-border bg-card rounded border px-1.5 py-0.5 text-xs">
              /
            </kbd>{" "}
            to search.
          </p>
        </div>
        {sections.length > 0 ? (
          <nav aria-label="Footer">
            <p className="eyebrow text-muted-foreground">Explore</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-10 gap-y-2.5 text-sm">
              {sections.map((section) => (
                <li key={section.href}>
                  <Link href={section.href} className={linkClass}>
                    {section.label}
                    {section.locked ? (
                      <>
                        <Lock className="size-3" aria-hidden="true" />
                        <span className="sr-only">(passcode required)</span>
                      </>
                    ) : null}
                  </Link>
                </li>
              ))}
              {showMap ? (
                <li>
                  <Link href="/travel/map" className={linkClass}>
                    Map
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
        ) : null}
      </div>
      <div className="border-border border-t">
        <p className="meta-label text-muted-foreground mx-auto max-w-7xl px-6 py-5 lg:px-10">
          © {year} Shan Mufti
        </p>
      </div>
    </footer>
  );
}
