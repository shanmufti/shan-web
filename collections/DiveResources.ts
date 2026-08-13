import type { CollectionConfig } from "payload";

import { publicContentAccess } from "./access";

export const DiveResources: CollectionConfig = {
  slug: "dive-resources",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "type", "featured"],
    group: "Diving",
  },
  access: publicContentAccess,
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "type",
      type: "select",
      required: true,
      options: [
        { label: "YouTube", value: "youtube" },
        { label: "Article", value: "article" },
        { label: "Other", value: "other" },
      ],
    },
    { name: "url", type: "text", required: true },
    { name: "summary", type: "textarea" },
    { name: "tags", type: "text", hasMany: true },
    { name: "featured", type: "checkbox", defaultValue: false },
    { name: "draft", type: "checkbox", defaultValue: false },
  ],
};
