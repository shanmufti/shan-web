import { notFound } from "next/navigation";

import { diving } from "#velite";
import { MDXContent } from "@/components/mdx-content";
import { formatDate } from "@/lib/format-date";

export function generateStaticParams() {
  return diving.map((dive) => ({ slug: dive.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dive = diving.find((d) => d.slug === slug);
  return dive ? { title: dive.title, description: dive.summary } : {};
}

export default async function DivePost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dive = diving.find((d) => d.slug === slug);
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
      <MDXContent code={dive.body} />
    </article>
  );
}
