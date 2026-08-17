import type { CollectionConfig } from "payload";

import { privateAccess } from "./access";

export const PackingLists: CollectionConfig = {
  slug: "packing-lists",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "tripDate", "shareSlug"],
    group: "Travel",
  },
  access: privateAccess,
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "basedOnTemplate",
      type: "relationship",
      relationTo: "packing-list-templates",
    },
    { name: "tripDate", type: "date" },
    { name: "relatedTravelPost", type: "relationship", relationTo: "travel" },
    {
      name: "shareSlug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          "Unguessable token for the public share link — the link itself is the access control, so keep it random.",
      },
    },
    {
      name: "items",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "category", type: "text" },
        { name: "qty", type: "number", defaultValue: 1 },
        { name: "checked", type: "checkbox", defaultValue: false },
      ],
    },
  ],
};
