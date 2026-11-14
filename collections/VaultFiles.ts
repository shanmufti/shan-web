import path from "path";
import type { CollectionConfig } from "payload";

import { privateAccess } from "./access";

/**
 * Private files (scans, contracts, certificates). In production they go to
 * R2 under the `vault/` prefix (see payload.config.ts); locally they're kept
 * on disk in ./vault-files (gitignored). Files are served only through
 * /api/vault-files/file/<name>, which checks login first, and in production
 * redirects to a signed R2 URL that expires after a minute.
 */
export const VaultFiles: CollectionConfig = {
  slug: "vault-files",
  labels: { singular: "Vault file", plural: "Vault files" },
  admin: {
    group: "Vault",
    useAsTitle: "filename",
    defaultColumns: ["filename", "title", "filesize", "createdAt"],
    description:
      "Owner only. Don't upload files that contain passwords or other secrets.",
  },
  access: privateAccess,
  defaultSort: "-createdAt",
  upload: {
    staticDir: path.resolve(process.cwd(), "vault-files"),
  },
  fields: [
    {
      name: "title",
      type: "text",
      admin: { description: "Optional label shown instead of the filename." },
    },
    { name: "notes", type: "textarea" },
  ],
};
