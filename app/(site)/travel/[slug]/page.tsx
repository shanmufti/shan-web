import { notFound } from "next/navigation";

import { travel } from "#velite";
import { MDXContent } from "@/components/mdx-content";
import { formatDate } from "@/lib/format-date";

export function generateStaticParams() {
  return travel.map((trip) => ({ slug: trip.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trip = travel.find((t) => t.slug === slug);
  return trip ? { title: trip.title, description: trip.summary } : {};
}

export default async function TravelPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trip = travel.find((t) => t.slug === slug);
  if (!trip) notFound();

  const start = formatDate(trip.startDate);
  const end = trip.endDate ? formatDate(trip.endDate) : null;

  return (
    <article className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-16">
      <h1>{trip.title}</h1>
      <p className="text-muted-foreground text-sm">
        {end ? `${start} – ${end}` : start} · {trip.location.name}
      </p>
      <MDXContent code={trip.body} />
    </article>
  );
}
