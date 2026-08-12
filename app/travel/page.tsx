import type { Metadata } from "next";

import { travel } from "#velite";
import { PostCard } from "@/components/post-card";
import { formatDate } from "@/lib/format-date";

export const metadata: Metadata = { title: "Travel" };

function dateRangeLabel(startDate: string, endDate?: string) {
  const start = formatDate(startDate);
  if (!endDate) return start;
  return `${start} – ${formatDate(endDate)}`;
}

export default function TravelIndex() {
  const trips = [...travel].sort(
    (a, b) => +new Date(b.startDate) - +new Date(a.startDate),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-2xl font-semibold">Travel</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {trips.map((trip) => (
          <PostCard
            key={trip.slug}
            href={trip.permalink}
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
