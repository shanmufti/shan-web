import type { CollectionConfig } from "payload";

import { SNIPPET_LANGUAGES } from "@/lib/highlight";

import { privateAccess } from "./access";

/**
 * Code snippets. The REST API is owner only; snippets marked public are
 * listed on /tools/snippets, which reads them server side.
 */
export const Snippets: CollectionConfig = {
  slug: "snippets",
  admin: {
    group: "Vault",
    useAsTitle: "title",
    defaultColumns: ["title", "language", "public", "updatedAt"],
    description:
      "Public snippets show on /tools/snippets. Never put API keys, tokens or passwords in a snippet.",
  },
  access: privateAccess,
  defaultSort: "title",
  fields: [
    { name: "title", type: "text", required: true },
    {
      type: "row",
      fields: [
        {
          name: "language",
          type: "select",
          required: true,
          defaultValue: "bash",
          options: SNIPPET_LANGUAGES.map((l) => ({
            value: l.value,
            label: l.label,
          })),
        },
        {
          name: "public",
          type: "checkbox",
          defaultValue: false,
          admin: { description: "List on /tools/snippets for anyone." },
        },
      ],
    },
    { name: "code", type: "code", required: true },
    {
      name: "tags",
      type: "text",
      hasMany: true,
      admin: { description: "Press Enter after each tag." },
    },
    { name: "notes", type: "textarea" },
  ],
};
