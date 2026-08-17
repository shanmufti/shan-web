import type { CollectionConfig } from "payload";

import { publicReadAccess } from "./access";

export const VisitedCountries: CollectionConfig = {
  slug: "visited-countries",
  admin: {
    useAsTitle: "country",
    defaultColumns: ["country", "yearsVisited"],
    group: "Travel",
  },
  access: publicReadAccess,
  fields: [
    {
      name: "country",
      type: "text",
      required: true,
      unique: true,
      admin: {
        description: "ISO 3166-1 alpha-3 code, e.g. CAN, THA, ESP.",
      },
    },
    { name: "yearsVisited", type: "number", hasMany: true },
    { name: "note", type: "textarea" },
  ],
};
