import type { Metadata } from "next";
import { getPayload } from "payload";

import config from "@payload-config";
import { PostCard } from "@/components/post-card";
import { formatDate } from "@/lib/format-date";

export const metadata: Metadata = { title: "Travel" };

function dateRangeLabel(startDate: string, endDate?: string | null) {
  const start = formatDate(startDate);
  if (!endDate) return start;
  return `${start} – ${formatDate(endDate)}`;
}

export default async function TravelIndex() {
  const payload = await getPayload({ config });
  const { docs: trips } = await payload.find({
    collection: "travel",
    where: { draft: { equals: false } },
    sort: "-startDate",
    limit: 100,
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-2xl font-semibold">Travel</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {trips.map((trip) => (
          <PostCard
            key={trip.slug}
            href={`/travel/${trip.slug}`}
            title={trip.title}
            summary={trip.summary}
            dateLabel={dateRangeLabel(trip.startDate, trip.endDate)}
            meta={trip.location.name}
          />
        ))}
        {trips.length === 0 ? (
          <p className="text-muted-foreground text-sm">No trips yet.</p>
        ) : null}
      </div>
    </div>
  );
}
