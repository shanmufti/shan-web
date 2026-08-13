import type { CollectionConfig } from "payload";

import { privateAccess } from "./access";

export const GearConfigs: CollectionConfig = {
  slug: "gear-configs",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "updatedAt"],
    group: "Diving",
  },
  access: privateAccess,
  fields: [
    { name: "name", type: "text", required: true, unique: true },
    { name: "notes", type: "textarea" },
    {
      name: "bcd",
      type: "relationship",
      relationTo: "dive-gear",
      filterOptions: { gearType: { equals: "bcd" } },
    },
    {
      name: "regulator",
      type: "relationship",
      relationTo: "dive-gear",
      filterOptions: { gearType: { equals: "regulator" } },
    },
    {
      name: "tank",
      type: "relationship",
      relationTo: "dive-gear",
      filterOptions: { gearType: { equals: "tank" } },
    },
    {
      name: "fins",
      type: "relationship",
      relationTo: "dive-gear",
      filterOptions: { gearType: { equals: "fins" } },
    },
    {
      name: "mask",
      type: "relationship",
      relationTo: "dive-gear",
      filterOptions: { gearType: { equals: "mask" } },
    },
    {
      name: "hood",
      type: "relationship",
      relationTo: "dive-gear",
    },
    {
      name: "lights",
      type: "relationship",
      relationTo: "dive-gear",
      hasMany: true,
    },
    {
      name: "accessories",
      type: "relationship",
      relationTo: "dive-gear",
      hasMany: true,
    },
    {
      name: "undergarmentSetup",
      type: "textarea",
      admin: {
        description:
          "Free-text undergarment preset (e.g. Winter Undergarments 1).",
      },
    },
  ],
};
