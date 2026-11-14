import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SecretCreateForm } from "@/components/secret-create-form";

export const metadata: Metadata = {
  title: "One-time secret",
  description: "Share a note through a link that opens once.",
};

export default function SecretPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-8 lg:px-10">
      <PageHeader eyebrow="Tools" title="One-time secret">
        <p className="text-muted-foreground mt-4 max-w-2xl">
          The text is encrypted in your browser before it&apos;s sent. The key
          is only in the link, after the #, so this site stores ciphertext it
          can&apos;t read. The link works once.
        </p>
        <p className="mt-4 text-sm">
          <Link
            href="/tools"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            All tools
          </Link>
        </p>
      </PageHeader>
      <SecretCreateForm />
      <ul className="text-muted-foreground mt-8 list-disc space-y-1 pl-5 text-sm">
        <li>
          Opening the link asks first, so chat link previews don&apos;t use it
          up.
        </li>
        <li>After it&apos;s opened or expires, the ciphertext is deleted.</li>
        <li>Up to 10 KB of text. No files.</li>
      </ul>
    </div>
  );
}
