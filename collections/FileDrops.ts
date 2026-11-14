import type { CollectionConfig } from "payload";

import { newToken } from "@/lib/tokens";
import { siteUrl } from "@/lib/site-url";

import { privateAccess } from "./access";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Time-limited public download links for one vault file. The token in the
 * link is the only key, so it's long and random. Anyone with the link can
 * download until it expires or runs out of downloads.
 */
export const FileDrops: CollectionConfig = {
  slug: "file-drops",
  labels: { singular: "File drop", plural: "File drops" },
  admin: {
    group: "Vault",
    useAsTitle: "token",
    defaultColumns: ["file", "expiresAt", "downloadCount", "maxDownloads"],
    description:
      "Share one vault file through a link that expires. Anyone with the link can download it until then.",
  },
  access: privateAccess,
  defaultSort: "-createdAt",
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === "create" && data && !data["token"]) {
          data["token"] = newToken();
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "file",
      type: "relationship",
      relationTo: "vault-files",
      required: true,
    },
    {
      name: "expiresAt",
      label: "Expires",
      type: "date",
      required: true,
      defaultValue: () => new Date(Date.now() + 7 * DAY_MS).toISOString(),
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "maxDownloads",
      label: "Max downloads",
      type: "number",
      min: 1,
      admin: { description: "Leave empty for no limit." },
    },
    {
      name: "downloadCount",
      label: "Downloads so far",
      type: "number",
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: "note",
      type: "textarea",
      maxLength: 500,
      admin: { description: "Shown on the public download page." },
    },
    {
      name: "token",
      type: "text",
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: "Set automatically when the drop is created.",
      },
    },
    {
      name: "link",
      type: "text",
      virtual: true,
      admin: { readOnly: true, description: "Send this link." },
      hooks: {
        afterRead: [
          ({ siblingData }: { siblingData?: { token?: unknown } }) =>
            typeof siblingData?.token === "string"
              ? `${siteUrl()}/drop/${siblingData.token}`
              : undefined,
        ],
      },
    },
  ],
};
