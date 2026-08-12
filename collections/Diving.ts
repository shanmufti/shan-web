import type { CollectionConfig } from "payload";

import { authenticated, publishedOrAuthenticated } from "./access";
import { baseFields, locationField } from "./fields";

export const Diving: CollectionConfig = {
  slug: "diving",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "date", "siteName", "draft"],
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
    { name: "siteName", type: "text" },
    { name: "depthMeters", type: "number" },
  ],
};
