import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PackingListChecklist } from "@/components/packing-list-checklist";
import { formatDate } from "@/lib/format-date";
import { getPackingListByShareSlug } from "@/lib/content";

export const metadata: Metadata = { title: "Packing list" };

export default async function PackingListSharePage({
  params,
}: Readonly<{ params: Promise<{ shareSlug: string }> }>) {
  const { shareSlug } = await params;
  const list = await getPackingListByShareSlug(shareSlug);
  if (!list) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 pt-16 pb-8 sm:pt-24 lg:px-10">
      <header>
        <h1 className="font-heading text-4xl sm:text-5xl">{list.name}</h1>
        {list.tripDate ? (
          <p className="text-muted-foreground mt-2 text-sm">
            {formatDate(list.tripDate)}
          </p>
        ) : null}
      </header>

      <PackingListChecklist shareSlug={shareSlug} items={list.items ?? []} />

      {(list.items ?? []).length === 0 ? (
        <p className="text-muted-foreground mt-8 text-sm">
          This list has no items yet.
        </p>
      ) : null}
    </div>
  );
}
