import type { CollectionConfig } from "payload";

import { SPLIT_CURRENCIES } from "@/lib/split-options";
import { siteUrl } from "@/lib/site-url";
import { newToken } from "@/lib/tokens";

import { privateAccess } from "./access";

/**
 * Cost splitter groups, shared by link at /split/<shareSlug>. Anyone can start
 * one from /tools/split (rate limited); only the owner can list them, here.
 */
export const SplitGroups: CollectionConfig = {
  slug: "split-groups",
  labels: { singular: "Split group", plural: "Split groups" },
  admin: {
    group: "Plans",
    useAsTitle: "name",
    defaultColumns: ["name", "currency", "link", "createdAt"],
    description:
      "Shared expense groups. Anyone with a group's link can add expenses and people.",
  },
  access: privateAccess,
  defaultSort: "-createdAt",
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === "create" && data && !data["shareSlug"]) {
          data["shareSlug"] = newToken();
        }
        return data;
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await req.payload.delete({
          collection: "split-expenses",
          where: { groupId: { equals: (doc as { id: number }).id } },
          overrideAccess: true,
          req,
        });
      },
    ],
  },
  fields: [
    { name: "name", type: "text", required: true, maxLength: 80 },
    {
      name: "currency",
      type: "select",
      required: true,
      defaultValue: "USD",
      options: SPLIT_CURRENCIES.map((c) => ({ label: c, value: c })),
    },
    {
      name: "people",
      type: "array",
      minRows: 1,
      maxRows: 30,
      admin: {
        description: "Rename rather than delete someone who has expenses.",
      },
      fields: [{ name: "name", type: "text", required: true, maxLength: 40 }],
    },
    {
      name: "shareSlug",
      label: "Share slug",
      type: "text",
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Set automatically. Anyone with the link can edit.",
      },
    },
    {
      name: "link",
      type: "text",
      virtual: true,
      admin: { position: "sidebar", readOnly: true },
      hooks: {
        afterRead: [
          ({ siblingData }: { siblingData?: { shareSlug?: unknown } }) =>
            typeof siblingData?.shareSlug === "string"
              ? `${siteUrl()}/split/${siblingData.shareSlug}`
              : undefined,
        ],
      },
    },
  ],
};
