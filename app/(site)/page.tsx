import config from "@payload-config";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";

import { visibleSections } from "@/lib/site-access";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

interface ExtraLink {
  label: string;
  href: string;
  description?: string | null | undefined;
}

function isExternal(href: string) {
  return /^(https?:|mailto:)/.test(href);
}

function LinkRow({ link }: Readonly<{ link: ExtraLink }>) {
  const content = (
    <>
      <span className="flex items-center gap-1.5 text-xl font-medium tracking-tight underline-offset-4 group-hover:underline sm:text-2xl">
        {link.label}
        <ArrowUpRight
          className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden="true"
        />
      </span>
      {link.description ? (
        <span className="text-muted-foreground text-[0.95rem] sm:text-right">
          {link.description}
        </span>
      ) : null}
    </>
  );
  const className =
    "group grid gap-1 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-baseline sm:gap-6";
  return isExternal(link.href) ? (
    <a href={link.href} className={className} rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link href={link.href} className={className}>
      {content}
    </Link>
  );
}

export default async function LandingPage() {
  const payload = await getPayload({ config });
  const [landing, sections] = await Promise.all([
    payload.findGlobal({ slug: "landing-page", depth: 0 }),
    visibleSections(),
  ]);

  const links: ExtraLink[] = [
    ...sections
      .filter((s) => s.inNav)
      .map((s) => ({ label: s.label, href: s.href, description: s.blurb })),
    ...(landing.links ?? []),
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 lg:px-10">
      <section className="flex min-h-[min(70svh,40rem)] flex-col justify-end pt-24 pb-16">
        {landing.eyebrow ? (
          <p className="meta-label text-muted-foreground">{landing.eyebrow}</p>
        ) : null}
        <h1 className="font-heading mt-4 text-[clamp(3rem,9vw,6.5rem)] leading-[0.95] tracking-[-0.045em]">
          {landing.headline}
        </h1>
        {landing.intro ? (
          <p className="text-muted-foreground mt-6 max-w-xl text-lg whitespace-pre-line">
            {landing.intro}
          </p>
        ) : null}
      </section>

      {links.length > 0 ? (
        <nav aria-label="Explore" className="pb-8">
          <p className="meta-label text-muted-foreground">Explore</p>
          <ul className="divide-border border-border mt-4 divide-y border-y">
            {links.map((link) => (
              <li key={`${link.href}-${link.label}`}>
                <LinkRow link={link} />
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
