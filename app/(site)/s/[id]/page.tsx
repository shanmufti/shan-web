import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { SecretReveal } from "@/components/secret-reveal";
import { secretIsWaiting } from "@/lib/secrets";

export const metadata: Metadata = {
  title: "Secret",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function Reveal({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  await connection();
  const { id } = await params;
  // Only checks; nothing is burned until the visitor presses Reveal.
  const waiting = await secretIsWaiting(id);
  return <SecretReveal id={id} waiting={waiting} />;
}

export default function SecretViewPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  return (
    <div className="mx-auto max-w-2xl px-6 pt-16 pb-8 sm:pt-24 lg:px-10">
      <p className="meta-label text-muted-foreground">One-time secret</p>
      <h1 className="font-heading mt-3 text-3xl sm:text-4xl">
        Someone sent you a secret
      </h1>
      <div className="border-border bg-card mt-8 rounded-lg border p-5">
        <Suspense
          fallback={
            <p className="text-muted-foreground text-sm">Checking the link…</p>
          }
        >
          <Reveal params={params} />
        </Suspense>
      </div>
    </div>
  );
}
