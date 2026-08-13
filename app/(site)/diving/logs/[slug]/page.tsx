import { RichText } from "@payloadcms/richtext-lexical/react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { DiveNotesSections, DiveVitalsGrid } from "@/components/dive-log";
import { DivingSubnav } from "@/components/diving-subnav";
import { getPublishedBySlug } from "@/lib/content";
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

export default async function DiveLogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dive = await getPublishedBySlug("diving", slug, { depth: 1 });
  if (!dive) notFound();

  const site = dive.siteName ?? dive.location.name;
  const photos = Array.isArray(dive.photos)
    ? dive.photos.filter(isMedia).filter((photo) => Boolean(photo.url))
    : [];

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <DivingSubnav current="/diving/logs" />

      <header className="mt-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {dive.title}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {formatDate(dive.date)}
          {site ? ` · ${site}` : ""}
        </p>
        {dive.summary && dive.summary !== "Dive log entry." ? (
          <p className="text-muted-foreground mt-4 text-sm">{dive.summary}</p>
        ) : null}
      </header>

      <DiveVitalsGrid dive={dive} />

      {photos.length > 0 ? (
        <div className="mt-10 flex gap-3 overflow-x-auto pb-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative h-40 w-56 shrink-0 overflow-hidden"
            >
              <Image
                src={photo.url ?? ""}
                alt={photo.alt || dive.title}
                fill
                className="object-cover"
                sizes="224px"
              />
            </div>
          ))}
        </div>
      ) : null}

      <DiveNotesSections dive={dive} />

      {dive.body ? (
        <div className="prose dark:prose-invert mt-10 max-w-none">
          <RichText data={dive.body} />
        </div>
      ) : null}
    </article>
  );
}
