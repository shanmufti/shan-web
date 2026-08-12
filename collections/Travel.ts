import type { CollectionConfig } from "payload";

import { authenticated, publishedOrAuthenticated } from "./access";
import { baseFields, locationField } from "./fields";

export const Travel: CollectionConfig = {
  slug: "travel",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "startDate", "draft"],
  },
  access: {
    read: publishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    ...baseFields,
    locationField,
    { name: "startDate", type: "date", required: true },
    { name: "endDate", type: "date" },
  ],
};
