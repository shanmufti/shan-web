import config from "@payload-config";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPayload } from "payload";

import { DivingSubnav } from "@/components/section-subnav";
import { LogDiveForm } from "@/components/log-dive-form";
import { getCurrentUser } from "@/lib/content";
import { diveToFormValues } from "@/lib/dive-form-initial";

export const metadata: Metadata = { title: "Edit dive" };

export default async function EditDiveLogPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin");
  }

  const { slug } = await params;
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "diving",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    user,
    overrideAccess: false,
  });
  const dive = docs[0];
  if (!dive) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 pt-16 pb-8 sm:pt-24 lg:px-10">
      <header>
        <p className="text-muted-foreground text-sm">
          <Link
            href={`/diving/logs/${dive.slug}`}
            className="underline-offset-4 hover:underline"
          >
            ← {dive.title}
          </Link>
        </p>
        <h1 className="font-heading mt-4 text-4xl sm:text-5xl">Edit dive</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Update details or attach a Shearwater CSV to backfill vitals and the
          depth profile.
        </p>
        <DivingSubnav current="/diving/logs" />
      </header>

      <LogDiveForm mode="edit" initial={diveToFormValues(dive)} />
    </div>
  );
}
