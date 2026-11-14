import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PlanBoard } from "@/components/plans/plan-board";
import { findPlan, getPlanView } from "@/lib/plans";
import { shareSlugExists } from "@/lib/share-links";
import { looksLikeToken } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Group plan",
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

function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-16 sm:pt-24 lg:px-10">
      <p className="meta-label text-muted-foreground">Group plan</p>
      <p className="text-muted-foreground mt-4 text-sm">Loading…</p>
    </div>
  );
}

/** Per request: answers change all the time and sealed rules depend on now. */
async function Plan({
  params,
}: Readonly<{ params: Promise<{ shareSlug: string }> }>) {
  await connection();
  const { shareSlug } = await params;
  const plan = await findPlan(shareSlug);
  if (!plan) notFound();
  const view = await getPlanView(plan);

  return (
    <div className="mx-auto max-w-3xl px-6 pb-16 lg:px-10">
      <PageHeader
        eyebrow="Group plan"
        title={view.title}
        {...(view.intro ? { lede: view.intro } : {})}
      />
      {view.blocks.length === 0 ? (
        <p className="text-muted-foreground">Nothing to answer yet.</p>
      ) : (
        <PlanBoard plan={view} />
      )}
    </div>
  );
}

export default async function PlanPage({
  params,
}: Readonly<{ params: Promise<{ shareSlug: string }> }>) {
  const { shareSlug } = await params;
  // Real 404 status for unknown links (see lib/share-links.ts).
  if (
    !looksLikeToken(shareSlug) ||
    !(await shareSlugExists("plans", "shareSlug", shareSlug))
  ) {
    notFound();
  }
  return (
    <Suspense fallback={<Loading />}>
      <Plan params={params} />
    </Suspense>
  );
}
