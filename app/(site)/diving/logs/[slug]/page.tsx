import { RichText } from "@payloadcms/richtext-lexical/react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  DiveEnvironmentSection,
  DiveGearSection,
  DiveNotesSections,
  DiveProblemsSection,
  DiveVitalsGrid,
} from "@/components/dive-log";
import { DiveProfileChart } from "@/components/dive-profile-chart";
import { Picture } from "@/components/picture";
import { DivingSubnav } from "@/components/section-subnav";
import {
  getCurrentUser,
  getPublishedBySlug,
  listPublished,
  staticSlugParams,
} from "@/lib/content";
import { parseProfileSamples } from "@/lib/dive-profile";
import { formatDate } from "@/lib/format-date";
import { mediaImage } from "@/lib/media";
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

/** Owner-only edit link; streams in per request. */
async function EditLink({ slug }: Readonly<{ slug: string }>) {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <Link
      href={`/diving/logs/${slug}/edit`}
      className="text-muted-foreground text-sm underline-offset-4 hover:underline"
    >
      Edit
    </Link>
  );
}

/** Published logs prerender at build; new ones render on first visit. */
export async function generateStaticParams() {
  return staticSlugParams(await listPublished("diving", { limit: 1000 }));
}

// A slug that isn't prerendered renders (and 404s) at request time.
export const instant = false;

export default async function DiveLogDetailPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const dive = await getPublishedBySlug("diving", slug, { depth: 1 });
  if (!dive) notFound();

  const site = dive.siteName ?? dive.location.name;
  const photos = Array.isArray(dive.photos)
    ? dive.photos.filter(isMedia).filter((photo) => Boolean(photo.url))
    : [];
  const samples = parseProfileSamples(dive.profileSamples);

  return (
    <article className="mx-auto max-w-4xl px-6 pt-16 pb-8 sm:pt-24 lg:px-10">
      <DivingSubnav current="/diving/logs" />

      <header className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-heading text-4xl sm:text-5xl">{dive.title}</h1>
          <Suspense fallback={null}>
            <EditLink slug={dive.slug} />
          </Suspense>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          {formatDate(dive.date)}
          {site ? ` · ${site}` : ""}
        </p>
        {dive.summary && dive.summary !== "Dive log entry." ? (
          <p className="text-muted-foreground mt-4 text-sm">{dive.summary}</p>
        ) : null}
      </header>

      <DiveVitalsGrid dive={dive} />

      {samples.length > 0 ? <DiveProfileChart samples={samples} /> : null}

      {photos.length > 0 ? (
        <div className="mt-10 flex gap-3 overflow-x-auto pb-2">
          {photos.map((photo) => {
            const image = mediaImage(photo, "card");
            return image ? (
              <div
                key={photo.id}
                className="h-40 w-56 shrink-0 overflow-hidden"
              >
                <Picture
                  image={{ ...image, alt: image.alt || dive.title }}
                  sizes="224px"
                  className="size-full object-cover"
                />
              </div>
            ) : null;
          })}
        </div>
      ) : null}

      <DiveEnvironmentSection dive={dive} />
      <DiveProblemsSection dive={dive} />
      <DiveGearSection dive={dive} />
      <DiveNotesSections dive={dive} />

      {dive.body ? (
        <div className="prose dark:prose-invert mt-10 max-w-none">
          <RichText data={dive.body} />
        </div>
      ) : null}
    </article>
  );
}
