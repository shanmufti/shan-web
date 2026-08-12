import { RichText } from "@payloadcms/richtext-lexical/react";
import { notFound } from "next/navigation";

import { getPublishedBySlug } from "@/lib/content";
import { formatDate } from "@/lib/format-date";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dive = await getPublishedBySlug("diving", slug);
  return dive ? { title: dive.title, description: dive.summary } : {};
}

export default async function DivePost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dive = await getPublishedBySlug("diving", slug);
  if (!dive) notFound();

  return (
    <article className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-16">
      <h1>{dive.title}</h1>
      <p className="text-muted-foreground text-sm">
        {formatDate(dive.date)}
        {dive.siteName ? ` · ${dive.siteName}` : ""}
        {` · ${dive.location.name}`}
        {dive.depthMeters != null ? ` · ${String(dive.depthMeters)}m` : ""}
      </p>
      <RichText data={dive.body} />
    </article>
  );
}
