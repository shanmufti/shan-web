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
  const post = await getPublishedBySlug("blog", slug);
  return post ? { title: post.title, description: post.summary } : {};
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedBySlug("blog", slug);
  if (!post) notFound();

  return (
    <article className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-16">
      <h1>{post.title}</h1>
      <p className="text-muted-foreground text-sm">{formatDate(post.date)}</p>
      <RichText data={post.body} />
    </article>
  );
}
