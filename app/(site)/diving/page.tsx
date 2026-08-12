import type { Metadata } from "next";
import { getPayload } from "payload";

import config from "@payload-config";
import { PostCard } from "@/components/post-card";
import { formatDate } from "@/lib/format-date";

export const metadata: Metadata = { title: "Diving" };

export default async function DivingIndex() {
  const payload = await getPayload({ config });
  const { docs: dives } = await payload.find({
    collection: "diving",
    where: { draft: { equals: false } },
    sort: "-date",
    limit: 100,
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-2xl font-semibold">Diving</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {dives.map((dive) => {
          const meta = [
            dive.siteName,
            dive.location.name,
            dive.depthMeters ? `${dive.depthMeters}m` : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <PostCard
              key={dive.slug}
              href={`/diving/${dive.slug}`}
              title={dive.title}
              summary={dive.summary}
              dateLabel={formatDate(dive.date)}
              meta={meta}
            />
          );
        })}
        {dives.length === 0 ? (
          <p className="text-muted-foreground text-sm">No dive logs yet.</p>
        ) : null}
      </div>
    </div>
  );
}
