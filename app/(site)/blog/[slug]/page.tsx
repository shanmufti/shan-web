import { notFound } from "next/navigation";

import { blog } from "#velite";
import { MDXContent } from "@/components/mdx-content";
import { formatDate } from "@/lib/format-date";

export function generateStaticParams() {
  return blog.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blog.find((p) => p.slug === slug);
  return post ? { title: post.title, description: post.summary } : {};
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blog.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <article className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-16">
      <h1>{post.title}</h1>
      <p className="text-muted-foreground text-sm">{formatDate(post.date)}</p>
      <MDXContent code={post.body} />
    </article>
  );
}
