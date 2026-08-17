import type { CollectionConfig } from "payload";

import { privateAccess } from "./access";

export const PackingListTemplates: CollectionConfig = {
  slug: "packing-list-templates",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "tripType"],
    group: "Travel",
  },
  access: privateAccess,
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "tripType",
      type: "select",
      options: [
        { label: "Dive trip", value: "dive-trip" },
        { label: "Cold weather", value: "cold-weather" },
        { label: "Carry-on only", value: "carry-on" },
        { label: "Other", value: "other" },
      ],
    },
    {
      name: "items",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "category", type: "text" },
        { name: "qty", type: "number", defaultValue: 1 },
      ],
    },
  ],
};
