import { RichText } from "@payloadcms/richtext-lexical/react";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import config from "@payload-config";
import { formatDate } from "@/lib/format-date";

async function getDive(slug: string) {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "diving",
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
    collection: "diving",
    where: { draft: { equals: false } },
    limit: 0,
  });
  return docs.map((dive) => ({ slug: dive.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dive = await getDive(slug);
  return dive ? { title: dive.title, description: dive.summary } : {};
}

export default async function DivePost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dive = await getDive(slug);
  if (!dive) notFound();

  return (
    <article className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-16">
      <h1>{dive.title}</h1>
      <p className="text-muted-foreground text-sm">
        {formatDate(dive.date)}
        {dive.siteName ? ` · ${dive.siteName}` : ""}
        {` · ${dive.location.name}`}
        {dive.depthMeters ? ` · ${dive.depthMeters}m` : ""}
      </p>
      <RichText data={dive.body} />
    </article>
  );
}
