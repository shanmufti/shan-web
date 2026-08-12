import type { CollectionConfig } from "payload";

import { baseFields } from "./fields";

export const Blog: CollectionConfig = {
  slug: "blog",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "date", "draft"],
  },
  access: {
    read: () => true,
  },
  fields: baseFields,
};
