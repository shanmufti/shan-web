import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { SharedListChecklist } from "@/components/lists/shared-list-checklist";
import { getSharedList } from "@/lib/shared-lists";
import { shareSlugExists } from "@/lib/share-links";
import { looksLikeToken } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Shared list",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Per request. The cached existence check runs before anything streams,
// so unknown links get a real 404; the content itself is read per request.
export const instant = false;

// A known (placeholder) param list makes any other slug render before the
// response starts, instead of streaming into a prerendered fallback shell.
export function generateStaticParams() {
  return [{ shareSlug: "__none__" }];
}

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
export default async function SharedListPage({
  params,
}: Readonly<{ params: Promise<{ shareSlug: string }> }>) {
  const { shareSlug } = await params;
  // Real 404 status for unknown links (see lib/share-links.ts).
  if (
    !looksLikeToken(shareSlug) ||
    !(await shareSlugExists("shared-lists", "shareSlug", shareSlug))
  ) {
    notFound();
  }
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
