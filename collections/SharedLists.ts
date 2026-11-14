import type { CollectionConfig } from "payload";

import { siteUrl } from "@/lib/site-url";
import { newShortToken } from "@/lib/tokens";

import { privateAccess } from "./access";

/**
 * Checklists shared by link (/lists/<shareSlug>). Anyone with the link can
 * tick, untick and add items through the page's own route handler; the REST
 * API stays owner-only.
 */
export const SharedLists: CollectionConfig = {
  slug: "shared-lists",
  labels: { singular: "Shared list", plural: "Shared lists" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "updatedAt"],
    group: "Tools",
    description:
      "Checklists anyone with the link can tick and add to. Also managed at /lists.",
  },
  access: privateAccess,
  defaultSort: "-updatedAt",
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === "create" && data && !data["shareSlug"]) {
          data["shareSlug"] = newShortToken();
        }
        return data;
      },
    ],
  },
  fields: [
    { name: "title", type: "text", required: true, maxLength: 120 },
    {
      name: "shareSlug",
      type: "text",
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description:
          "Unguessable part of the share link, set automatically. The link itself is the access control.",
      },
    },
    {
      name: "link",
      type: "text",
      virtual: true,
      admin: { readOnly: true, description: "Send this link." },
      hooks: {
        afterRead: [
          ({ siblingData }: { siblingData?: { shareSlug?: unknown } }) =>
            typeof siblingData?.shareSlug === "string"
              ? `${siteUrl()}/lists/${siblingData.shareSlug}`
              : undefined,
        ],
      },
    },
    {
      name: "items",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true, maxLength: 200 },
        { name: "checked", type: "checkbox", defaultValue: false },
      ],
    },
  ],
};
