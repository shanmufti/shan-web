import config from "@payload-config";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import { Suspense } from "react";

import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { SharedListCreateForm } from "@/components/shared-list-create-form";
import { requireOwner } from "@/lib/site-access";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Shared lists",
  robots: { index: false, follow: false },
};

const linkClass =
  "text-muted-foreground hover:text-foreground underline-offset-4 hover:underline";

async function OwnerLists() {
  // The proxy already 404s everyone else (the section is owner only).
  await requireOwner();
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "shared-lists",
    sort: "-updatedAt",
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  return (
    <>
      <section aria-labelledby="new-list">
        <h2 id="new-list" className="mb-3 text-lg font-medium">
          New list
        </h2>
        <SharedListCreateForm />
      </section>

      <section aria-labelledby="your-lists" className="mt-12">
        <h2 id="your-lists" className="text-lg font-medium">
          Your lists
        </h2>
        {docs.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">No lists yet.</p>
        ) : (
          <ul className="border-border bg-card mt-3 divide-y rounded-lg border">
            {docs.map((doc) => {
              const items = doc.items ?? [];
              const done = items.filter((i) => i.checked).length;
              const href = `/lists/${doc.shareSlug ?? ""}`;
              return (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={href}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {doc.title}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {done} of {items.length} ticked
                    </p>
                  </div>
                  <CopyButton
                    text={`${siteUrl()}${href}`}
                    label={`link to ${doc.title}`}
                  >
                    Copy link
                  </CopyButton>
                  <Link
                    href={`/admin/collections/shared-lists/${String(doc.id)}`}
                    className={`${linkClass} text-xs`}
                  >
                    Edit<span className="sr-only"> {doc.title}</span> in admin
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

export default function SharedListsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-8 lg:px-10">
      <PageHeader eyebrow="Tools" title="Shared lists">
        <p className="text-muted-foreground mt-4 max-w-2xl">
          Anyone with a list&apos;s link can tick, untick and add items. Remove
          items or delete a list in admin.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/tools" className={linkClass}>
            All tools
          </Link>
        </p>
      </PageHeader>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">Loading…</p>}
      >
        <OwnerLists />
      </Suspense>
    </div>
  );
}
