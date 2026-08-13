import type { CollectionConfig } from "payload";

import { publicReadAccess } from "./access";

export const DiveSkills: CollectionConfig = {
  slug: "dive-skills",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "category", "level"],
    group: "Diving",
  },
  access: publicReadAccess,
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "category",
      type: "select",
      required: true,
      options: [
        { label: "Buoyancy", value: "buoyancy" },
        { label: "Navigation", value: "navigation" },
        { label: "Rescue", value: "rescue" },
        { label: "Propulsion", value: "propulsion" },
        { label: "Equipment", value: "equipment" },
        { label: "Cert-required", value: "cert-required" },
        { label: "Other", value: "other" },
      ],
    },
    {
      name: "level",
      type: "select",
      required: true,
      defaultValue: "learning",
      options: [
        { label: "Learning", value: "learning" },
        { label: "Practicing", value: "practicing" },
        { label: "Solid", value: "solid" },
      ],
    },
    { name: "description", type: "textarea" },
    { name: "relatedCert", type: "text" },
  ],
};
