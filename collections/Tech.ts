import type { CollectionConfig } from "payload";

import { publicContentAccess } from "./access";
import { baseFields } from "./fields";

export const Tech: CollectionConfig = {
  slug: "tech",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "date", "draft"],
  },
  access: publicContentAccess,
  fields: [
    ...baseFields,
    { name: "repoUrl", type: "text" },
    { name: "demoUrl", type: "text" },
  ],
};
