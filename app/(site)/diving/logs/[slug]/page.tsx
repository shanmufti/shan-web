import { RichText } from "@payloadcms/richtext-lexical/react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { DetailPager, type PagerItem } from "@/components/detail-pager";
import {
  DiveEnvironmentSection,
  DiveGearSection,
  DiveNotesSections,
  DiveProblemsSection,
  DiveVitalsGrid,
} from "@/components/dive-log";
import { DiveProfileLoader } from "@/components/dive-profile-loader";
import {
  diveBottomTime,
  diveMaxDepth,
  getCurrentUser,
  getPublishedBySlug,
  listPublished,
  type DiveDoc,
} from "@/lib/content";
import { diveSite } from "@/lib/dive-logbook";
import { parseProfileSamples } from "@/lib/dive-profile";
import { formatDate } from "@/lib/format-date";
import type { Media } from "@/payload-types";

function isMedia(value: number | Media): value is Media {
  return typeof value === "object";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const dive = await getPublishedBySlug("diving", slug);
  return dive ? { title: dive.title, description: dive.summary } : {};
}

function KeyNumber({
  label,
  value,
  unit,
}: Readonly<{ label: string; value: string; unit: string }>) {
  return (
    <div className="bg-card border-border rounded-2xl border p-4 sm:p-5">
      <dt className="eyebrow text-muted-foreground">{label}</dt>
      <dd className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-medium tracking-[-0.03em] tabular-nums sm:text-4xl">
          {value}
        </span>
        <span className="text-muted-foreground text-sm">{unit}</span>
      </dd>
    </div>
  );
}

function keyNumbers(dive: DiveDoc) {
  const vitals = dive.vitals;
  const depth = diveMaxDepth(dive);
  const time = diveBottomTime(dive);
  const temp = vitals?.bottomTempC ?? vitals?.avgTempC ?? null;
  const cards: { label: string; value: string; unit: string }[] = [];
  if (depth != null)
    cards.push({ label: "Max depth", value: String(depth), unit: "m" });
  if (time != null)
    cards.push({ label: "Bottom time", value: String(time), unit: "min" });
  if (temp != null)
    cards.push({ label: "Water temp", value: String(temp), unit: "°C" });
  if (vitals?.sac != null)
    cards.push({ label: "SAC", value: String(vitals.sac), unit: "psi/min" });
  return cards;
}

function diveLink(dive: DiveDoc | undefined): PagerItem | undefined {
  return dive
    ? {
        href: `/diving/logs/${dive.slug}`,
        title: dive.title,
        meta: `${formatDate(dive.date)} · ${diveSite(dive)}`,
      }
    : undefined;
}

export default async function DiveLogDetailPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const [dive, user, all] = await Promise.all([
    getPublishedBySlug("diving", slug, { depth: 1 }),
    getCurrentUser(),
    listPublished("diving", { limit: 1000 }),
  ]);
  if (!dive) notFound();

  const photos = Array.isArray(dive.photos)
    ? dive.photos
        .filter(isMedia)
        .flatMap((photo) => (photo.url ? [{ ...photo, src: photo.url }] : []))
    : [];
  const samples = parseProfileSamples(dive.profileSamples);
  const cards = keyNumbers(dive);
  // Listed newest first: the earlier dive is the next one in the list.
  const index = all.findIndex((d) => d.id === dive.id);
  const earlier = index >= 0 ? all[index + 1] : undefined;
  const later = index > 0 ? all[index - 1] : undefined;

  return (
    <article className="mx-auto max-w-5xl px-4 pt-8 pb-20 sm:px-6 sm:pt-12 lg:px-10">
      <Breadcrumbs
        items={[
          { label: "Diving", href: "/diving" },
          { label: "Logs", href: "/diving/logs" },
          { label: dive.title },
        ]}
      />

      <header className="mt-8">
        <p className="meta-label text-muted-foreground">
          {[
            dive.diveNumber != null ? `Dive ${String(dive.diveNumber)}` : null,
            formatDate(dive.date),
            dive.startTime,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-heading text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02] tracking-[-0.04em]">
            {dive.title}
          </h1>
          {user ? (
            <Link
              href={`/diving/logs/${dive.slug}/edit`}
              className="border-border hover:bg-muted inline-flex h-9 items-center rounded-full border px-4 text-sm"
            >
              Edit
            </Link>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-2 text-lg">{diveSite(dive)}</p>
        {dive.summary && dive.summary !== "Dive log entry." ? (
          <p className="text-muted-foreground mt-3">{dive.summary}</p>
        ) : null}
      </header>

      {cards.length > 0 ? (
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((card) => (
            <KeyNumber key={card.label} {...card} />
          ))}
        </dl>
      ) : null}

      {samples.length > 0 ? (
        <section
          aria-labelledby="profile"
          className="bg-card border-border mt-4 rounded-2xl border p-4 sm:p-6"
        >
          <h2 id="profile" className="eyebrow text-muted-foreground">
            Depth profile
          </h2>
          <div
            className="mt-4"
            role="img"
            aria-label={`Depth over time, down to ${String(Math.max(...samples.map((s) => s.d)))} m`}
          >
            <DiveProfileLoader samples={samples} />
          </div>
        </section>
      ) : null}

      {photos.length > 0 ? (
        <div className="mt-10 flex gap-3 overflow-x-auto pb-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative h-40 w-56 shrink-0 overflow-hidden rounded-xl"
            >
              <Image
                src={photo.src}
                alt={photo.alt ?? dive.title}
                fill
                className="object-cover"
                sizes="224px"
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-x-12 lg:grid-cols-2">
        <div>
          <DiveGearSection dive={dive} />
          <DiveEnvironmentSection dive={dive} />
          <DiveProblemsSection dive={dive} />
        </div>
        <div>
          <DiveNotesSections dive={dive} />
          {dive.body ? (
            <div className="prose dark:prose-invert mt-10 max-w-none">
              <RichText data={dive.body} />
            </div>
          ) : null}
        </div>
      </div>

      <details className="border-border mt-12 rounded-2xl border p-5">
        <summary className="cursor-pointer font-medium">All numbers</summary>
        <DiveVitalsGrid dive={dive} />
      </details>

      <DetailPager
        label="More dives"
        prev={diveLink(earlier)}
        next={diveLink(later)}
        prevLabel="Earlier dive"
        nextLabel="Later dive"
      />
    </article>
  );
}
