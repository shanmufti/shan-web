import type { CollectionConfig } from "payload";

import { authenticated, publishedOrAuthenticated } from "./access";
import { baseFields } from "./fields";

export const Tech: CollectionConfig = {
  slug: "tech",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "date", "draft"],
  },
  access: {
    read: publishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    ...baseFields,
    { name: "repoUrl", type: "text" },
    { name: "demoUrl", type: "text" },
  ],
};
