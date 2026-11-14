import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { SplitBoard } from "@/components/split/split-board";
import { siteUrl } from "@/lib/site-url";
import { findGroup, getSplitView } from "@/lib/split";
import { formatMoney } from "@/lib/split-math";
import { shareSlugExists } from "@/lib/share-links";
import { looksLikeToken } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Cost splitter",
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
    <div className="mx-auto max-w-6xl px-6 pt-16 sm:pt-24 lg:px-10">
      <p className="meta-label text-muted-foreground">Cost splitter</p>
      <p className="text-muted-foreground mt-4 text-sm">Loading…</p>
    </div>
  );
}

/** Per request: anyone with the link can change it at any time. */
async function Group({
  params,
}: Readonly<{ params: Promise<{ shareSlug: string }> }>) {
  await connection();
  const { shareSlug } = await params;
  const group = await findGroup(shareSlug);
  if (!group) notFound();
  const view = await getSplitView(group);
  const link = `${siteUrl()}/split/${view.slug}`;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 lg:px-10">
      <PageHeader eyebrow="Cost splitter" title={view.name}>
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-sm">
          <div>
            <dt className="meta-label text-muted-foreground">Total spent</dt>
            <dd className="mt-1 font-mono font-medium">
              {formatMoney(view.total, view.currency)}
            </dd>
          </div>
          <div>
            <dt className="meta-label text-muted-foreground">People</dt>
            <dd className="mt-1 font-mono font-medium">{view.people.length}</dd>
          </div>
          <div className="min-w-0">
            <dt className="meta-label text-muted-foreground">Share link</dt>
            <dd className="mt-1 flex items-center gap-2">
              <span className="text-muted-foreground hidden truncate font-mono text-xs sm:inline">
                Anyone with this link can view and edit
              </span>
              <CopyButton text={link} label="share link">
                Copy link
              </CopyButton>
            </dd>
          </div>
        </dl>
      </PageHeader>
      <SplitBoard view={view} today={today} />
    </div>
  );
}

export default async function SplitGroupPage({
  params,
}: Readonly<{ params: Promise<{ shareSlug: string }> }>) {
  const { shareSlug } = await params;
  // Real 404 status for unknown links (see lib/share-links.ts).
  if (
    !looksLikeToken(shareSlug) ||
    !(await shareSlugExists("split-groups", "shareSlug", shareSlug))
  ) {
    notFound();
  }
  return (
    <Suspense fallback={<Loading />}>
      <Group params={params} />
    </Suspense>
  );
}
