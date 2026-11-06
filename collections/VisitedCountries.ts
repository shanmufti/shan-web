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
    {
      name: "regions",
      type: "text",
      hasMany: true,
      admin: {
        description:
          "Optional. ISO 3166-2 codes of the states or provinces you visited, e.g. US-CA, CA-BC. When set, the travel map shades only these instead of the whole country (US states and Canadian provinces for now).",
      },
    },
    { name: "note", type: "textarea" },
  ],
};
