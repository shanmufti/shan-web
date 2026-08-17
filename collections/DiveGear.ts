import type { CollectionConfig } from "payload";

import { privateAccess } from "./access";

export const DiveGear: CollectionConfig = {
  slug: "dive-gear",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "gearType", "status", "lastServiced"],
    group: "Diving",
  },
  access: privateAccess,
  fields: [
    { name: "name", type: "text", required: true },
    { name: "brand", type: "text" },
    { name: "model", type: "text" },
    {
      name: "gearType",
      type: "select",
      required: true,
      options: [
        { label: "Regulator", value: "regulator" },
        { label: "Tank", value: "tank" },
        { label: "BCD", value: "bcd" },
        { label: "Drysuit", value: "drysuit" },
        { label: "Fins", value: "fins" },
        { label: "Mask", value: "mask" },
        { label: "Light", value: "light" },
        { label: "Computer", value: "computer" },
        { label: "Utility", value: "utility" },
        { label: "Outer Layer", value: "outer-layer" },
        { label: "Undergarment", value: "undergarment" },
        { label: "Other", value: "other" },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "owned",
      options: [
        { label: "Owned", value: "owned" },
        { label: "Researching", value: "researching" },
        { label: "Retired", value: "retired" },
      ],
    },
    { name: "purchaseDate", type: "date" },
    { name: "lastServiced", type: "date" },
    { name: "nextServiceDue", type: "date" },
    {
      name: "serviceIntervalMonths",
      type: "number",
      min: 1,
      admin: {
        description:
          "How often this needs servicing. Used with the most recent service-log entry to compute next-due.",
      },
    },
    {
      name: "serviceLog",
      type: "array",
      admin: { description: "History of servicing for this item." },
      fields: [
        { name: "date", type: "date", required: true },
        { name: "description", type: "text" },
        { name: "cost", type: "number" },
        { name: "provider", type: "text" },
      ],
    },
    { name: "notes", type: "textarea" },
    { name: "linkUrl", type: "text" },
    { name: "photo", type: "upload", relationTo: "media" },
  ],
};
