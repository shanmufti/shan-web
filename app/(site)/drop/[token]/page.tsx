import { Download } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { buttonVariants } from "@/components/ui/button";
import { findOpenDrop } from "@/lib/file-drops";
import { formatBytes } from "@/lib/format-bytes";
import { shareSlugExists } from "@/lib/share-links";
import { looksLikeToken } from "@/lib/tokens";
import { vaultFileName } from "@/lib/vault";

export const metadata: Metadata = {
  title: "File",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Token links are checked against the database on every request.
export const instant = false;

// A known (placeholder) param list makes any other token render before the
// response starts, instead of streaming into a prerendered fallback shell.
export function generateStaticParams() {
  return [{ token: "__none__" }];
}

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export default async function DropPage({
  params,
}: Readonly<{ params: Promise<{ token: string }> }>) {
  const { token } = await params;
  // Real 404 status for unknown links (see lib/share-links.ts).
  if (
    !looksLikeToken(token) ||
    !(await shareSlugExists("file-drops", "token", token))
  ) {
    notFound();
  }
  await connection();
  const drop = await findOpenDrop(token);
  if (!drop) notFound();

  const name = vaultFileName(drop.file);

  return (
    <div className="mx-auto max-w-xl px-6 pt-16 pb-8 sm:pt-24 lg:px-10">
      <p className="meta-label text-muted-foreground">Shared file</p>
      <h1 className="font-heading mt-3 text-3xl break-all sm:text-4xl">
        {name}
      </h1>
      <dl className="text-muted-foreground mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {typeof drop.file.filesize === "number" ? (
          <>
            <dt>Size</dt>
            <dd className="text-foreground">
              {formatBytes(drop.file.filesize)}
            </dd>
          </>
        ) : null}
        <dt>Available until</dt>
        <dd className="text-foreground">{formatExpiry(drop.expiresAt)} UTC</dd>
        {drop.downloadsLeft !== null ? (
          <>
            <dt>Downloads left</dt>
            <dd className="text-foreground">{drop.downloadsLeft}</dd>
          </>
        ) : null}
      </dl>
      {drop.note ? (
        <p className="border-border mt-6 border-l-2 pl-4 text-sm whitespace-pre-line">
          {drop.note}
        </p>
      ) : null}
      {/* POST, so link previews and prefetchers don't use up downloads. */}
      <form method="post" action={`/drop/${token}/download`} className="mt-8">
        <button type="submit" className={buttonVariants({ size: "lg" })}>
          <Download aria-hidden="true" />
          Download
        </button>
      </form>
    </div>
  );
}
