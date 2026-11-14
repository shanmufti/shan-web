import { ArrowUpRight, Lock, Plus } from "lucide-react";
import Link from "next/link";

import { HobbyIcon } from "@/components/hobbies/hobby-icon";
import { BentoGrid, BentoTile } from "@/components/ui/bento";
import { formatDate, formatShortDate } from "@/lib/format-date";
import { ITEM_LABEL, type HomeItem, type HomeView } from "@/lib/home";
import { hobbyDescription } from "@/lib/hobby-options";
import type { LandingPage } from "@/payload-types";

import { Placeholder } from "./placeholder";
import { ToolDirectory } from "./tool-directory";

type Cols = 1 | 2 | 3 | 4;

function isExternal(href: string) {
  return /^(https?:|mailto:)/.test(href);
}

function PrivateMark({ className }: Readonly<{ className?: string }>) {
  return (
    <span className={className}>
      <Lock className="inline size-3 align-[-0.1em]" aria-hidden="true" />{" "}
      Private
    </span>
  );
}

function Hero({
  landing,
  isOwner,
}: Readonly<{ landing: LandingPage; isOwner: boolean }>) {
  const intro = landing.intro?.trim();
  return (
    // Sits on the layout's water light (components/layout/water-light.tsx).
    <header className="flex min-h-[18rem] flex-col justify-end gap-4 pt-16 pb-10 sm:min-h-[22rem] sm:pb-14">
      {landing.eyebrow ? (
        <p className="eyebrow text-primary">{landing.eyebrow}</p>
      ) : null}
      <h1 className="font-heading text-[clamp(3.25rem,10vw,6.5rem)] leading-[0.95] font-medium tracking-[-0.05em]">
        {landing.headline || "Shan Mufti"}
      </h1>
      <p className="text-muted-foreground max-w-2xl text-lg whitespace-pre-line">
        {intro ?? <Placeholder>[Intro: Shan to write]</Placeholder>}
      </p>
      {isOwner ? (
        <p className="text-sm">
          <Link
            href="/admin/globals/landing-page"
            prefetch={false}
            className="text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Edit the intro, Now and links
          </Link>
        </p>
      ) : null}
    </header>
  );
}

function LatestTile({ item, cols }: Readonly<{ item: HomeItem; cols: Cols }>) {
  return (
    <BentoTile
      tone="coral"
      cols={cols}
      headingLevel={2}
      eyebrow={`Latest · ${ITEM_LABEL[item.kind]}`}
      title={<span className="text-2xl tracking-[-0.02em]">{item.title}</span>}
      description={item.summary}
      href={item.href}
    >
      <p className="text-coral-foreground/85 text-sm">
        <time dateTime={item.date}>{formatDate(item.date)}</time>
        {item.isPrivate ? (
          <>
            {" · "}
            <PrivateMark />
          </>
        ) : null}
      </p>
    </BentoTile>
  );
}

function NowTile({
  now,
  cols,
}: Readonly<{ now: LandingPage["now"]; cols: Cols }>) {
  const text = now?.text?.trim();
  return (
    <BentoTile eyebrow="Now" cols={cols}>
      <p className="text-base leading-snug whitespace-pre-line">
        {text ?? (
          <Placeholder>
            [Now: what Shan is working on or learning this month]
          </Placeholder>
        )}
      </p>
      {text && now?.updated ? (
        <p className="meta-label text-muted-foreground mt-3">
          Updated{" "}
          <time dateTime={now.updated}>{formatShortDate(now.updated)}</time>
        </p>
      ) : null}
    </BentoTile>
  );
}

function ExploreTile({ view, cols }: Readonly<{ view: HomeView; cols: Cols }>) {
  const sections = view.sections.filter((s) => s.onLanding);
  return (
    <BentoTile tone="kelp" eyebrow="On this site" cols={cols} layout="flow">
      <ul
        className={
          cols > 1 ? "grid grid-cols-2 gap-x-6 gap-y-1.5" : "space-y-1.5"
        }
      >
        {sections.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className="group/link inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              {s.label}
              <ArrowUpRight
                className="text-muted-foreground size-3.5"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </BentoTile>
  );
}

function RecentTile({
  items,
  cols,
}: Readonly<{ items: HomeItem[]; cols: Cols }>) {
  return (
    <BentoTile eyebrow="Recently" cols={cols} layout="flow">
      <ul className="divide-border divide-y">
        {items.map((item) => (
          <li key={`${item.kind}-${String(item.id)}`} className="py-2.5">
            <Link
              href={item.href}
              className="font-medium underline-offset-4 hover:underline"
            >
              {item.title}
            </Link>
            <p className="meta-label text-muted-foreground mt-1">
              {ITEM_LABEL[item.kind]} ·{" "}
              <time dateTime={item.date}>{formatShortDate(item.date)}</time>
              {item.isPrivate ? (
                <>
                  {" · "}
                  <PrivateMark />
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </BentoTile>
  );
}

function StatsTile({ view, cols }: Readonly<{ view: HomeView; cols: Cols }>) {
  return (
    <BentoTile tone="water" eyebrow="In numbers" cols={cols}>
      <dl className="flex flex-wrap gap-x-8 gap-y-4">
        {view.stats.map((stat) => (
          <div key={stat.label} className="flex flex-col-reverse">
            <dt className="meta-label text-muted-foreground">
              <Link
                href={stat.href}
                className="hover:text-foreground underline-offset-4 hover:underline"
              >
                {stat.label}
              </Link>
            </dt>
            <dd className="text-4xl font-medium tracking-[-0.03em] tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </BentoTile>
  );
}

function LinksTile({
  links,
  cols,
}: Readonly<{ links: NonNullable<LandingPage["links"]>; cols: Cols }>) {
  return (
    <BentoTile tone="sand" cols={cols} eyebrow="Elsewhere" layout="flow">
      {links.length > 0 ? (
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-lg">
          {links.map((link) => {
            const external = isExternal(link.href);
            const content = (
              <>
                {link.label}
                <ArrowUpRight
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
              </>
            );
            const className =
              "inline-flex items-center gap-1 underline-offset-4 hover:underline";
            return (
              <li key={`${link.href}-${link.label}`}>
                {external ? (
                  <a href={link.href} className={className} rel="noreferrer">
                    {content}
                  </a>
                ) : (
                  <Link href={link.href} className={className}>
                    {content}
                  </Link>
                )}
                {link.description ? (
                  <span className="text-muted-foreground block text-sm">
                    {link.description}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          <Placeholder>[Links: Shan to add socials and contact]</Placeholder>
        </p>
      )}
    </BentoTile>
  );
}

function SectionHeading({
  id,
  title,
  link,
}: Readonly<{
  id: string;
  title: string;
  link?: { href: string; label: string } | undefined;
}>) {
  return (
    <div className="mt-16 mb-5 flex items-end justify-between gap-4 sm:mt-20">
      <h2 id={id} className="text-3xl font-medium tracking-[-0.03em]">
        {title}
      </h2>
      {link ? (
        <Link
          href={link.href}
          className="text-primary text-sm underline-offset-4 hover:underline"
        >
          {link.label}
        </Link>
      ) : null}
    </div>
  );
}

function referenceLabel(count: number) {
  if (count === 0) return "No references yet";
  return count === 1 ? "1 reference" : `${String(count)} references`;
}

function HobbiesSection({ view }: Readonly<{ view: HomeView }>) {
  const hobbies = view.hobbies;
  const isOwner = view.viewer === "owner";
  if (!hobbies || (hobbies.length === 0 && !isOwner)) return null;
  return (
    <section aria-labelledby="home-hobbies">
      <SectionHeading
        id="home-hobbies"
        title="Hobbies"
        link={
          hobbies.length > 0
            ? { href: "/hobbies", label: "All hobbies" }
            : undefined
        }
      />
      <BentoGrid columns={3} className="auto-rows-[minmax(9rem,auto)]">
        {hobbies.slice(0, 6).map((hobby) => (
          <BentoTile
            key={hobby.id}
            eyebrow={
              <>
                <HobbyIcon name={hobby.icon} className="size-4" />
                {referenceLabel(hobby.referenceCount)}
                {hobby.isPrivate ? <PrivateMark className="ml-auto" /> : null}
              </>
            }
            title={hobby.name}
            description={
              hobby.description ?? (
                <Placeholder>{hobbyDescription(null)}</Placeholder>
              )
            }
            href={`/hobbies/${hobby.slug}`}
          />
        ))}
        {isOwner ? (
          <BentoTile
            tone="dashed"
            title={
              <span className="inline-flex items-center gap-2">
                <Plus className="size-4" aria-hidden="true" />
                Add a hobby
              </span>
            }
            description="Only you see this tile."
            href="/admin/collections/hobbies/create"
          />
        ) : null}
      </BentoGrid>
    </section>
  );
}

/**
 * The home page bento hub. Pure rendering: everything per-viewer is already
 * decided in `view` (lib/home.ts), so the anonymous version doubles as the
 * static fallback.
 */
export function HomeView({
  landing,
  view,
}: Readonly<{ landing: LandingPage; view: HomeView }>) {
  const [first, ...rest] = view.latest;
  const recent = rest.slice(0, 3);
  const hasExplore = view.sections.some((s) => s.onLanding);

  // Top row: Latest (2) · Now · On this site, widened to fill four columns.
  // Without a Latest tile, Now and On this site split the row.
  // With neither (everything hidden), the links tile moves up beside Now.
  const linksOnTop = !first && !hasExplore;
  const nowCols: Cols = first && hasExplore ? 1 : 2;
  const exploreCols: Cols = first ? 1 : 2;
  // Second row: Recently and the numbers, side by side or full width.
  const showStats = view.stats.length > 0;
  const secondCols: Cols = recent.length > 0 && showStats ? 2 : 4;
  const links = landing.links ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <Hero landing={landing} isOwner={view.viewer === "owner"} />

      <BentoGrid>
        {first ? <LatestTile item={first} cols={2} /> : null}
        <NowTile now={landing.now} cols={nowCols} />
        {hasExplore ? <ExploreTile view={view} cols={exploreCols} /> : null}
        {linksOnTop ? <LinksTile links={links} cols={2} /> : null}
        {recent.length > 0 ? (
          <RecentTile items={recent} cols={secondCols} />
        ) : null}
        {showStats ? <StatsTile view={view} cols={secondCols} /> : null}
      </BentoGrid>

      {view.tools.length > 0 ? (
        <section aria-labelledby="home-tools">
          <SectionHeading
            id="home-tools"
            title="Tools"
            link={
              view.toolsHubOpen
                ? { href: "/tools", label: "All tools" }
                : undefined
            }
          />
          <ToolDirectory tools={view.tools} />
        </section>
      ) : null}

      <HobbiesSection view={view} />

      {linksOnTop ? null : (
        <BentoGrid className="mt-16 auto-rows-auto sm:mt-20">
          <LinksTile links={links} cols={4} />
        </BentoGrid>
      )}
    </div>
  );
}
