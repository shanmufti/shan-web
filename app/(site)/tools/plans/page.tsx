import config from "@payload-config";
import { ArrowUpRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import { Suspense } from "react";

import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { currentViewer } from "@/lib/site-access";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Group plans",
  description:
    "Date polls, votes, RSVPs and who's bringing what, shared by link.",
};

function VisitorNote() {
  return (
    <p className="text-muted-foreground max-w-xl">
      Group plans are shared by link. If someone sent you one, open that link
      and pick your name.
    </p>
  );
}

/** Owner only: their plans with share links. Everyone else sees the note. */
async function OwnerPlans() {
  if ((await currentViewer()) !== "owner") return <VisitorNote />;
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "plans",
    sort: "-updatedAt",
    limit: 100,
    depth: 0,
    overrideAccess: true,
    select: { title: true, shareSlug: true, closed: true, updatedAt: true },
  });
  return (
    <div>
      <Link
        href="/admin/collections/plans/create"
        className={buttonVariants({ size: "lg" })}
      >
        <Plus aria-hidden="true" /> New plan in admin
      </Link>
      {docs.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">No plans yet.</p>
      ) : (
        <ul className="divide-border border-border bg-card rounded-tile mt-6 divide-y border">
          {docs.map((plan) => {
            const path = `/plans/${plan.shareSlug ?? ""}`;
            return (
              <li
                key={plan.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={path}
                    className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                  >
                    {plan.title}
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                  {plan.closed ? (
                    <span className="text-muted-foreground ml-2 text-xs">
                      Closed
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton
                    text={`${siteUrl()}${path}`}
                    label={`link to ${plan.title}`}
                  >
                    Copy link
                  </CopyButton>
                  <Link
                    href={`/admin/collections/plans/${String(plan.id)}`}
                    className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                  >
                    Edit
                    <span className="sr-only"> {plan.title}</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function PlansToolPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-16 lg:px-10">
      <PageHeader
        eyebrow="Tools · Everyday"
        title="Group plans"
        lede="Date polls, votes (optionally sealed until a reveal time), RSVPs and a bring list, on one page friends open by link."
      />
      <Suspense fallback={<VisitorNote />}>
        <OwnerPlans />
      </Suspense>
    </div>
  );
}
