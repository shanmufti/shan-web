import type { Metadata } from "next";
import { getPayload } from "payload";

import config from "@payload-config";
import { PostCard } from "@/components/post-card";
import { formatDate } from "@/lib/format-date";

export const metadata: Metadata = { title: "Blog" };

export default async function BlogIndex() {
  const payload = await getPayload({ config });
  const { docs: posts } = await payload.find({
    collection: "blog",
    where: { draft: { equals: false } },
    sort: "-date",
    limit: 100,
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-2xl font-semibold">Blog</h1>
      <div className="mt-8 flex flex-col gap-4">
        {posts.map((post) => (
          <PostCard
            key={post.slug}
            href={`/blog/${post.slug}`}
            title={post.title}
            summary={post.summary}
            dateLabel={formatDate(post.date)}
            tags={post.tags ?? undefined}
          />
        ))}
        {posts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No posts yet.</p>
        ) : null}
      </div>
    </div>
  );
}
