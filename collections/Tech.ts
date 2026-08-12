import type { CollectionConfig } from "payload";

import { baseFields } from "./fields";

export const Tech: CollectionConfig = {
  slug: "tech",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "date", "draft"],
  },
  access: {
    read: () => true,
  },
  fields: [
    ...baseFields,
    { name: "repoUrl", type: "text" },
    { name: "demoUrl", type: "text" },
  ],
};
