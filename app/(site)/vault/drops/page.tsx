import type { Metadata } from "next";
import Link from "next/link";

import { CopyButton } from "@/components/copy-button";
import { FileDropForm } from "@/components/vault/file-drop-form";
import { PageHeader } from "@/components/page-header";
import { adminLinkClass, VaultSubnav } from "@/components/vault/vault-subnav";
import { expireFileDrop } from "@/lib/actions/file-drops";
import { isDropOpen } from "@/lib/file-drops";
import { siteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { vaultFileLabel, vaultFileName } from "@/lib/vault";
import { listFileDrops, listVaultFiles } from "@/lib/vault-data";

export const metadata: Metadata = { title: "File drops" };

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

function expiryText(iso: string): string {
  const past = new Date(iso).getTime() <= Date.now();
  return `${past ? "Expired" : "Expires"} ${formatWhen(iso)} UTC`;
}

export default async function VaultDropsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { file } = await searchParams;
  const selected = typeof file === "string" ? Number(file) : undefined;
  const [files, drops] = await Promise.all([listVaultFiles(), listFileDrops()]);
  const origin = siteUrl();

  return (
    <>
      <PageHeader eyebrow="Vault" title="File drops">
        <p className="text-muted-foreground mt-4 max-w-2xl text-sm">
          A drop is a link to one vault file that anyone can download until it
          expires or reaches its download limit. After that the link shows a
          404.
        </p>
        <VaultSubnav current="/vault/drops" />
      </PageHeader>

      <section aria-labelledby="new-drop-heading" className="max-w-2xl">
        <h2 id="new-drop-heading" className="mb-4 text-lg font-medium">
          New drop
        </h2>
        <FileDropForm
          files={files.map((f) => ({
            id: f.id,
            label: f.title
              ? `${f.title} (${vaultFileName(f)})`
              : vaultFileName(f),
          }))}
          selectedFileId={
            selected && Number.isInteger(selected) ? selected : undefined
          }
        />
      </section>

      <section aria-labelledby="drops-heading" className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="drops-heading" className="text-lg font-medium">
            Drops
          </h2>
          <Link
            href="/admin/collections/file-drops"
            className={cn(adminLinkClass, "text-sm")}
          >
            Manage in admin
          </Link>
        </div>
        {drops.length > 0 ? (
          <ul className="divide-border border-border mt-4 divide-y border-y">
            {drops.map((drop) => {
              const open = isDropOpen(drop);
              const link = `${origin}/drop/${drop.token ?? ""}`;
              const fileName =
                typeof drop.file === "object"
                  ? vaultFileLabel(drop.file)
                  : `File ${String(drop.file)}`;
              return (
                <li
                  key={drop.id}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-2 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium break-all">{fileName}</p>
                    <p className="text-muted-foreground text-sm tabular-nums">
                      <span
                        className={
                          open ? "text-foreground" : "text-destructive"
                        }
                      >
                        {open ? "Open" : "Closed"}
                      </span>
                      {" · "}
                      {expiryText(drop.expiresAt)}
                      {" · "}
                      {drop.downloadCount ?? 0}
                      {typeof drop.maxDownloads === "number"
                        ? ` of ${String(drop.maxDownloads)}`
                        : ""}{" "}
                      downloads
                    </p>
                  </div>
                  {open ? (
                    <div className="flex items-center gap-3">
                      <CopyButton text={link} label={`link for ${fileName}`}>
                        Copy link
                      </CopyButton>
                      <form action={expireFileDrop}>
                        <input type="hidden" name="id" value={drop.id} />
                        <button
                          type="submit"
                          className="text-destructive text-xs underline-offset-4 hover:underline"
                        >
                          End now
                        </button>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground mt-4 text-sm">No drops yet.</p>
        )}
      </section>
    </>
  );
}
