import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ExternalLink, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { LockedPage } from "@/components/locked-page";
import { HUB_DETAIL, PageTransition } from "@/components/page-transition";
import { PlacesMapLoader } from "@/components/places-map-loader";
import { ArticleBody } from "@/components/rich-text";
import { Badge } from "@/components/ui/badge";
import { countryName } from "@/lib/country-names";
import { formatDateRange } from "@/lib/format-date";
import { categoryLabel } from "@/lib/google-maps-takeout";
import { mediaAlt, mediaUrl } from "@/lib/journeys";
import {
  getDestination,
  groupPlaces,
  type DestinationDoc,
  type PlaceView,
} from "@/lib/places";
import { shareSlugExists } from "@/lib/share-links";

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

// Per request. The placeholder param list and the cached existence check
// let an unknown slug answer a real 404 before anything streams.
export const instant = false;

export function generateStaticParams() {
  return [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const result = await getDestination(slug);
  if (result.status === "missing") return {};
  if (result.status === "locked") {
    return { title: result.title, robots: { index: false, follow: false } };
  }
  const { doc } = result;
  return {
    title: doc.title,
    alternates: { canonical: `/travel/places/${doc.slug}` },
    ...(doc.draft || doc.visibility === "private"
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}

/** True when a Lexical document has any text in it. */
function hasText(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const n = node as { text?: unknown; children?: unknown; root?: unknown };
  if (typeof n.text === "string" && n.text.trim() !== "") return true;
  if (n.root) return hasText(n.root);
  return Array.isArray(n.children) && n.children.some(hasText);
}

function visitYears(doc: DestinationDoc): string[] {
  const years = (doc.datesVisited ?? []).map((d) => d.from.slice(0, 4));
  return [...new Set(years)].sort((a, b) => a.localeCompare(b));
}

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="border-border border-t pt-3">
      <dt className="meta-label text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[0.95rem] tabular-nums">{value}</dd>
    </div>
  );
}

function Facts({
  doc,
  places,
}: Readonly<{ doc: DestinationDoc; places: number }>) {
  const stays = doc.datesVisited ?? [];
  const facts: [string, string][] = [
    ...(doc.country
      ? [["Country", countryName(doc.country)] as [string, string]]
      : []),
    ...(stays.length > 0
      ? [
          [
            stays.length === 1 ? "Visit" : "Visits",
            stays.length === 1 && stays[0]
              ? formatDateRange(stays[0].from, stays[0].to)
              : String(stays.length),
          ] as [string, string],
        ]
      : []),
    ["Saved places", String(places)],
  ];
  return (
    <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
      {facts.map(([label, value]) => (
        <Fact key={label} label={label} value={value} />
      ))}
    </dl>
  );
}

function RestrictedBadge({
  kind,
}: Readonly<{ kind: PlaceView["restricted"] }>) {
  if (!kind) return null;
  return (
    <Badge variant="outline">
      <Lock aria-hidden="true" />
      {kind === "owner" ? "Only you" : "Private"}
    </Badge>
  );
}

function PlaceRow({ place }: Readonly<{ place: PlaceView }>) {
  return (
    <li
      id={`place-${String(place.id)}`}
      tabIndex={-1}
      className="focus-visible:outline-ring scroll-mt-24 rounded-md py-4 focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-medium">{place.name}</h4>
        <RestrictedBadge kind={place.restricted} />
      </div>
      {place.note ? (
        <p className="mt-1 text-[0.95rem] leading-relaxed whitespace-pre-line">
          {place.note}
        </p>
      ) : null}
      {place.address ? (
        <p className="text-muted-foreground mt-1 text-sm">{place.address}</p>
      ) : null}
      {place.url ? (
        <a
          href={place.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary mt-2 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
        >
          Open in Google Maps
          <ExternalLink className="size-3.5" aria-hidden="true" />
          <span className="sr-only">
            {" "}
            for {place.name} (opens in a new tab)
          </span>
        </a>
      ) : null}
    </li>
  );
}

function Recommendations({
  places,
  center,
}: Readonly<{ places: PlaceView[]; center: [number, number] | null }>) {
  const groups = groupPlaces(places);
  const pinned = places.flatMap((p) =>
    p.lat == null || p.lng == null
      ? []
      : [
          {
            id: p.id,
            name: p.name,
            category: categoryLabel(p.category),
            lat: p.lat,
            lng: p.lng,
          },
        ],
  );
  return (
    <section aria-labelledby="recommendations" className="mt-20">
      <h2 id="recommendations" className="font-heading text-3xl">
        My recommendations
      </h2>
      {places.length === 0 ? (
        <p className="text-muted-foreground mt-4">No saved places yet.</p>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
          {pinned.length > 0 ? (
            <div className="lg:sticky lg:top-[calc(var(--header-offset,4rem)+1rem)] lg:order-2 lg:self-start">
              <div
                className="border-border aspect-[4/3] overflow-hidden rounded-md border"
                role="region"
                aria-label={`Map of ${String(pinned.length)} saved places`}
              >
                <PlacesMapLoader places={pinned} center={center} />
              </div>
              {pinned.length < places.length ? (
                <p className="text-muted-foreground mt-2 text-sm">
                  {places.length - pinned.length} of {places.length} places have
                  no coordinates and are only in the list.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="lg:order-1">
            {groups.map((group) => (
              <section
                key={group.category}
                aria-labelledby={`cat-${group.category}`}
                className="mb-8"
              >
                <h3
                  id={`cat-${group.category}`}
                  className="meta-label text-muted-foreground border-border border-b pb-2"
                >
                  {group.label} · {group.places.length}
                </h3>
                <ul className="divide-border divide-y">
                  {group.places.map((place) => (
                    <PlaceRow key={place.id} place={place} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Pager({
  previous,
  next,
}: Readonly<{
  previous: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}>) {
  return (
    <nav
      aria-label="More places"
      className="border-border mt-24 grid gap-6 border-t pt-8 sm:grid-cols-3"
    >
      <Link
        transitionTypes={HUB_DETAIL}
        href="/travel/places"
        className="meta-label text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All places
      </Link>
      {previous ? (
        <Link
          transitionTypes={HUB_DETAIL}
          href={`/travel/places/${previous.slug}`}
          className="group"
        >
          <span className="meta-label text-muted-foreground">Previous</span>
          <span className="mt-1 block font-medium underline-offset-4 group-hover:underline">
            {previous.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          transitionTypes={HUB_DETAIL}
          href={`/travel/places/${next.slug}`}
          className="group sm:text-right"
        >
          <span className="meta-label text-muted-foreground inline-flex items-center gap-1.5">
            Next
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </span>
          <span className="mt-1 block font-medium underline-offset-4 group-hover:underline">
            {next.title}
          </span>
        </Link>
      ) : null}
    </nav>
  );
}

function JourneyLinks({
  journeys,
}: Readonly<{ journeys: { slug: string; title: string }[] }>) {
  if (journeys.length === 0) return null;
  return (
    <p className="text-muted-foreground mt-6 text-sm">
      Part of{" "}
      {journeys.map((j, i) => (
        <span key={j.slug}>
          {i > 0 ? ", " : ""}
          <Link
            transitionTypes={HUB_DETAIL}
            href={`/travel/${j.slug}`}
            className="text-foreground underline underline-offset-4"
          >
            {j.title}
          </Link>
        </span>
      ))}
    </p>
  );
}

export default async function DestinationPage({ params }: Props) {
  const { slug } = await params;
  // Real 404 status for unknown slugs (see lib/share-links.ts).
  if (!(await shareSlugExists("destinations", "slug", slug))) notFound();
  // Per viewer (drafts, private places): never prerendered.
  await connection();
  const result = await getDestination(slug);
  if (result.status === "missing") notFound();
  if (result.status === "locked") {
    return (
      <LockedPage
        kind="Destination"
        title={result.title}
        next={`/travel/places/${slug}`}
      />
    );
  }

  const { doc, places, journeys, previous, next } = result;
  const cover = mediaUrl(doc.cover);
  const years = visitYears(doc);
  const center: [number, number] | null =
    doc.coordinates?.lat != null && doc.coordinates.lng != null
      ? [doc.coordinates.lat, doc.coordinates.lng]
      : null;
  const eyebrow = [
    "Destination",
    doc.country ? countryName(doc.country) : null,
    years.length > 0 ? `Visited ${years.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageTransition>
      <article className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-10">
        <header className="pt-12 sm:pt-20">
          <Link
            transitionTypes={HUB_DETAIL}
            href="/travel/places"
            className="meta-label text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Places
          </Link>
          <p className="meta-label text-muted-foreground mt-8 flex flex-wrap items-center gap-2">
            {eyebrow}
            {doc.draft ? <Badge variant="outline">Draft</Badge> : null}
            {doc.visibility === "private" ? (
              <Badge variant="outline">Private</Badge>
            ) : null}
          </p>
          <h1 className="font-heading mt-3 max-w-4xl text-[clamp(2.5rem,6vw,5rem)] leading-[0.98] tracking-[-0.04em]">
            {doc.title}
          </h1>
          <JourneyLinks journeys={journeys} />
        </header>

        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={mediaAlt(doc.cover) ?? ""}
            className="mt-12 aspect-[21/9] w-full rounded-md object-cover"
          />
        ) : null}

        <Facts doc={doc} places={places.length} />

        <div className="mt-14">
          {hasText(doc.writeUp) && doc.writeUp ? (
            <ArticleBody data={doc.writeUp} />
          ) : (
            <p className="border-border text-muted-foreground max-w-[680px] rounded-md border border-dashed p-6 font-mono text-sm">
              [Write-up: Shan to write]
            </p>
          )}
        </div>

        <Recommendations places={places} center={center} />

        <Pager previous={previous} next={next} />
      </article>
    </PageTransition>
  );
}
