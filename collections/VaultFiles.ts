import path from "path";
import type { CollectionConfig } from "payload";

import { renameVaultUpload } from "@/lib/vault-upload-names";

import { privateAccess } from "./access";

/**
 * Private files (scans, contracts, certificates). In production they go to
 * R2 under the `vault/` prefix (see payload.config.ts); locally they're kept
 * on disk in ./vault-files (gitignored).
 *
 * Every file is stored under a random name (lib/vault-upload-names.ts), so
 * its R2 key can't be guessed from the bucket's public domain; the uploaded
 * name is kept in `originalFilename`. The site downloads through
 * /vault/files/<id>/download (owner only, original name); Payload's own
 * /api/vault-files/file/<name> also checks login, then redirects to a signed
 * R2 URL that expires after a minute.
 */
export const VaultFiles: CollectionConfig = {
  slug: "vault-files",
  labels: { singular: "Vault file", plural: "Vault files" },
  admin: {
    group: "Vault",
    useAsTitle: "originalFilename",
    defaultColumns: ["originalFilename", "title", "filesize", "createdAt"],
    description:
      "Owner only. Don't upload files that contain passwords or other secrets.",
  },
  access: privateAccess,
  defaultSort: "-createdAt",
  hooks: {
    beforeOperation: [renameVaultUpload],
  },
  upload: {
    staticDir: path.resolve(process.cwd(), "vault-files"),
  },
  fields: [
    {
      name: "originalFilename",
      label: "Original file name",
      type: "text",
      admin: {
        readOnly: true,
        description:
          "Name the file was uploaded with. It's stored under a random name.",
      },
    },
    {
      name: "title",
      type: "text",
      admin: { description: "Optional label shown instead of the filename." },
    },
    { name: "notes", type: "textarea" },
  ],
};
