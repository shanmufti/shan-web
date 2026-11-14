import config from "@payload-config";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { getPayload } from "payload";
import { Suspense } from "react";

import { CONTENT_CACHE_LIFE, LANDING_PAGE_TAG } from "@/lib/cache-tags";
import { publicSections, visibleSections } from "@/lib/site-access";
import type { SiteSection } from "@/lib/site-sections";

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
  const className =
    "group inline-flex items-center gap-1.5 text-lg underline-offset-4 hover:underline";
  const content = (
    <>
      {link.label}
      <ArrowUpRight
        className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        aria-hidden="true"
      />
    </>
  );
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

async function landingContent() {
  "use cache";
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(LANDING_PAGE_TAG);
  const payload = await getPayload({ config });
  return payload.findGlobal({ slug: "landing-page", depth: 0 });
}

function LinkList({ links }: Readonly<{ links: ExtraLink[] }>) {
  if (links.length === 0) return null;
  return (
    <ul className="mt-8 space-y-2">
      {links.map((link) => (
        <li key={`${link.href}-${link.label}`}>
          <LinkRow link={link} />
        </li>
      ))}
    </ul>
  );
}

function sectionLinks(sections: SiteSection[]): ExtraLink[] {
  return sections
    .filter((s) => s.onLanding)
    .map((s) => ({ label: s.label, href: s.href }));
}

/** Sections this visitor can open, followed by the extra links. */
async function ViewerLinks({ extra }: Readonly<{ extra: ExtraLink[] }>) {
  const sections = await visibleSections();
  return <LinkList links={[...sectionLinks(sections), ...extra]} />;
}

/** What an anonymous visitor sees; part of the static shell. */
async function PublicLinks({ extra }: Readonly<{ extra: ExtraLink[] }>) {
  const sections = await publicSections();
  return <LinkList links={[...sectionLinks(sections), ...extra]} />;
}

/** Deliberately bare: a name and whatever is open right now. */
export default async function LandingPage() {
  const landing = await landingContent();
  const extra: ExtraLink[] = landing.links ?? [];

  return (
    <div className="mx-auto flex min-h-[60svh] max-w-xl flex-col justify-center px-6 py-24">
      {landing.eyebrow ? (
        <p className="meta-label text-muted-foreground">{landing.eyebrow}</p>
      ) : null}
      <h1 className="font-heading mt-2 text-3xl">{landing.headline}</h1>
      {landing.intro ? (
        <p className="text-muted-foreground mt-3 whitespace-pre-line">
          {landing.intro}
        </p>
      ) : null}
      <Suspense fallback={<PublicLinks extra={extra} />}>
        <ViewerLinks extra={extra} />
      </Suspense>
    </div>
  );
}
