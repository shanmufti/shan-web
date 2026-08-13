import type { CollectionConfig } from "payload";

import { publicContentAccess } from "./access";
import { baseFields, locationField } from "./fields";

export const Travel: CollectionConfig = {
  slug: "travel",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "startDate", "draft"],
  },
  access: publicContentAccess,
  fields: [
    ...baseFields,
    locationField,
    { name: "startDate", type: "date", required: true },
    { name: "endDate", type: "date" },
  ],
};
