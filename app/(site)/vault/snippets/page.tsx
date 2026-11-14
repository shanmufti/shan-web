import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SnippetList } from "@/components/snippet-list";
import { adminLinkClass, VaultSubnav } from "@/components/vault/vault-subnav";
import { listSnippets } from "@/lib/vault-data";

export const metadata: Metadata = { title: "Snippets" };

export default async function VaultSnippetsPage() {
  const snippets = await listSnippets();

  return (
    <>
      <PageHeader eyebrow="Vault" title="Snippets">
        <p className="text-muted-foreground mt-4 max-w-2xl text-sm">
          All snippets. Ones marked public also show on{" "}
          <Link href="/tools/snippets" className="underline underline-offset-4">
            /tools/snippets
          </Link>
          .
        </p>
        <VaultSubnav current="/vault/snippets" />
      </PageHeader>

      <p className="mb-6 text-sm">
        <Link
          href="/admin/collections/snippets/create"
          className={adminLinkClass}
        >
          New snippet in admin
        </Link>
      </p>

      {snippets.length > 0 ? (
        <SnippetList
          snippets={snippets.map((s) => ({
            id: s.id,
            title: s.title,
            language: s.language,
            code: s.code,
            tags: s.tags ?? null,
            notes: s.notes ?? null,
            isPublic: Boolean(s.public),
            editHref: `/admin/collections/snippets/${String(s.id)}`,
          }))}
        />
      ) : (
        <p className="text-muted-foreground text-sm">No snippets yet.</p>
      )}
    </>
  );
}
