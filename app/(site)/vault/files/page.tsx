import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { adminLinkClass, VaultSubnav } from "@/components/vault-subnav";
import { formatBytes } from "@/lib/format-bytes";
import { formatDate } from "@/lib/format-date";
import { vaultFileHref, vaultFileLabel, vaultFileName } from "@/lib/vault";
import { listVaultFiles } from "@/lib/vault-data";

export const metadata: Metadata = { title: "Files" };

export default async function VaultFilesPage() {
  const files = await listVaultFiles();

  return (
    <>
      <PageHeader eyebrow="Vault" title="Files">
        <p className="text-muted-foreground mt-4 max-w-2xl text-sm">
          Private files. Downloads check that you&apos;re logged in. Don&apos;t
          upload files that contain passwords or other secrets.
        </p>
        <VaultSubnav current="/vault/files" />
      </PageHeader>

      <p className="text-sm">
        <Link
          href="/admin/collections/vault-files/create"
          className={adminLinkClass}
        >
          Upload a file in admin
        </Link>
      </p>

      {files.length > 0 ? (
        <ul className="divide-border border-border mt-6 divide-y border-y">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-2 py-3"
            >
              <span className="min-w-0 break-all">
                <a
                  href={vaultFileHref(file)}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {vaultFileLabel(file)}
                </a>
                {file.title ? (
                  <span className="text-muted-foreground ml-2 text-sm">
                    {vaultFileName(file)}
                  </span>
                ) : null}
              </span>
              <span className="text-muted-foreground flex flex-wrap gap-x-4 text-sm tabular-nums">
                {typeof file.filesize === "number" ? (
                  <span>{formatBytes(file.filesize)}</span>
                ) : null}
                <span>{formatDate(file.createdAt)}</span>
                <Link
                  href={`/vault/drops?file=${String(file.id)}`}
                  className={adminLinkClass}
                >
                  Share
                </Link>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-6 text-sm">No files yet.</p>
      )}
    </>
  );
}
