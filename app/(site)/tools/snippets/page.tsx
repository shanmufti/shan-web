import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SnippetList } from "@/components/snippet-list";
import { listPublicSnippets } from "@/lib/vault-data";

export const metadata: Metadata = { title: "Snippets" };

export default async function PublicSnippetsPage() {
  const snippets = await listPublicSnippets();

  return (
    <div className="mx-auto max-w-4xl px-6 pb-8 lg:px-10">
      <PageHeader eyebrow="Tools" title="Snippets">
        <p className="mt-4 text-sm">
          <Link
            href="/tools"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            All tools
          </Link>
        </p>
      </PageHeader>
      {snippets.length > 0 ? (
        <SnippetList
          snippets={snippets.map((s) => ({
            id: s.id,
            title: s.title,
            language: s.language,
            code: s.code,
            tags: s.tags ?? null,
            notes: s.notes ?? null,
          }))}
        />
      ) : (
        <p className="text-muted-foreground text-sm">No snippets yet.</p>
      )}
    </div>
  );
}
