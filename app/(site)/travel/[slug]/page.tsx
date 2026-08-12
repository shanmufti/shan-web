import { RichText } from "@payloadcms/richtext-lexical/react";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import config from "@payload-config";
import { formatDate } from "@/lib/format-date";

async function getTrip(slug: string) {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "travel",
    where: {
      and: [{ slug: { equals: slug } }, { draft: { equals: false } }],
    },
    limit: 1,
    overrideAccess: false,
  });
  return docs[0];
}

export async function generateStaticParams() {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "travel",
    where: { draft: { equals: false } },
    limit: 0,
  });
  return docs.map((trip) => ({ slug: trip.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trip = await getTrip(slug);
  return trip ? { title: trip.title, description: trip.summary } : {};
}

export default async function TravelPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trip = await getTrip(slug);
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
