import type { CollectionConfig } from "payload";

import { baseFields, locationField } from "./fields";

export const Diving: CollectionConfig = {
  slug: "diving",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "date", "siteName", "draft"],
  },
  access: {
    read: () => true,
  },
  fields: [
    ...baseFields,
    locationField,
    { name: "siteName", type: "text" },
    { name: "depthMeters", type: "number" },
  ],
};
