import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { SharedListChecklist } from "@/components/shared-list-checklist";
import { getSharedList } from "@/lib/shared-lists";

export const metadata: Metadata = {
  title: "Shared list",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function SharedList({
  params,
}: Readonly<{ params: Promise<{ shareSlug: string }> }>) {
  await connection();
  const { shareSlug } = await params;
  const list = await getSharedList(shareSlug);
  if (!list) notFound();
  return (
    <>
      <p className="meta-label text-muted-foreground">Shared list</p>
      <h1 className="font-heading mt-3 text-[clamp(2rem,4vw,3rem)] break-words">
        {list.title}
      </h1>
      <SharedListChecklist shareSlug={shareSlug} initial={list} />
    </>
  );
}

/** Anyone with the link; the slug is checked against the database. */
export default function SharedListPage({
  params,
}: Readonly<{ params: Promise<{ shareSlug: string }> }>) {
  return (
    <div className="mx-auto max-w-2xl px-6 pt-16 pb-8 sm:pt-24 lg:px-10">
      <Suspense
        fallback={
          <p className="text-muted-foreground text-sm">Loading list…</p>
        }
      >
        <SharedList params={params} />
      </Suspense>
    </div>
  );
}
