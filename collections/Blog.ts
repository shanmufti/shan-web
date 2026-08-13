import type { CollectionConfig } from "payload";

import { publicContentAccess } from "./access";
import { baseFields } from "./fields";

export const Blog: CollectionConfig = {
  slug: "blog",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "date", "draft"],
  },
  access: publicContentAccess,
  fields: baseFields,
};
