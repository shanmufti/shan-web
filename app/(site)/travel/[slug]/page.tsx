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
  const trip = await getPublishedBySlug("travel", slug);
  return trip ? { title: trip.title, description: trip.summary } : {};
}

export default async function TravelPost({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const trip = await getPublishedBySlug("travel", slug);
  if (!trip) notFound();

  const start = formatDate(trip.startDate);
  const end = trip.endDate ? formatDate(trip.endDate) : null;

  return (
    <article className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-16">
      <h1>{trip.title}</h1>
      <p className="text-muted-foreground text-sm">
        {end ? `${start} – ${end}` : start} · {trip.location.name}
      </p>
      <RichText data={trip.body} />
    </article>
  );
}
