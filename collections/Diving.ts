import type { CollectionConfig } from "payload";

import { publicCreateContentAccess } from "./access";
import { locationField, slugField } from "./fields";

export const Diving: CollectionConfig = {
  slug: "diving",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "date", "siteName", "draft"],
    group: "Diving",
  },
  access: publicCreateContentAccess,
  fields: [
    { name: "title", type: "text", required: true, maxLength: 99 },
    slugField,
    { name: "date", type: "date", required: true },
    {
      name: "summary",
      type: "textarea",
      required: true,
      maxLength: 280,
      defaultValue: "Dive log entry.",
    },
    { name: "tags", type: "text", hasMany: true },
    { name: "cover", type: "upload", relationTo: "media" },
    { name: "draft", type: "checkbox", defaultValue: false },
    { name: "featured", type: "checkbox", defaultValue: false },

    {
      type: "row",
      fields: [
        { name: "siteName", type: "text", admin: { width: "50%" } },
        {
          name: "buddyOrShop",
          type: "text",
          label: "Dive Buddy / Shop",
          admin: { width: "50%" },
        },
      ],
    },
    locationField,

    {
      name: "vitals",
      type: "group",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "maxDepthMeters",
              type: "number",
              min: 0,
              admin: { width: "33%" },
            },
            {
              name: "bottomTimeMinutes",
              type: "number",
              min: 0,
              admin: { width: "33%" },
            },
            {
              name: "visibilityMeters",
              type: "number",
              min: 0,
              admin: { width: "33%" },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "surfaceTempC",
              type: "number",
              admin: { width: "50%" },
            },
            {
              name: "bottomTempC",
              type: "number",
              admin: { width: "50%" },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "weightLbs",
              type: "number",
              min: 0,
              admin: { width: "33%" },
            },
            {
              name: "gasType",
              type: "select",
              defaultValue: "air",
              options: [
                { label: "Air", value: "air" },
                { label: "Nitrox", value: "nitrox" },
                { label: "Trimix", value: "trimix" },
                { label: "Other", value: "other" },
              ],
              admin: { width: "33%" },
            },
            {
              name: "sac",
              type: "number",
              min: 0,
              admin: {
                width: "33%",
                description: "Surface air consumption (optional)",
              },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "startPressurePsi",
              type: "number",
              min: 0,
              admin: { width: "50%" },
            },
            {
              name: "endPressurePsi",
              type: "number",
              min: 0,
              admin: { width: "50%" },
            },
          ],
        },
      ],
    },

    {
      name: "equipmentConfig",
      type: "relationship",
      relationTo: "gear-configs",
    },
    {
      name: "photos",
      type: "upload",
      relationTo: "media",
      hasMany: true,
    },
    {
      name: "skills",
      type: "relationship",
      relationTo: "dive-skills",
      hasMany: true,
    },

    {
      name: "notes",
      type: "group",
      fields: [
        { name: "skillsPracticed", type: "textarea" },
        {
          name: "buddyNotes",
          type: "textarea",
          label: "Dive Buddies & Team Notes",
        },
        { name: "thermalComfort", type: "textarea" },
        { name: "trimNotes", type: "textarea", label: "Trim Observations" },
        {
          name: "gearIssues",
          type: "textarea",
          label: "Gear Function / Issues",
        },
        {
          name: "environmentalNotes",
          type: "textarea",
          label: "Environmental Notes (Marine Life / Visibility / Current)",
        },
        {
          name: "lessonsLearned",
          type: "textarea",
          label: "Lessons Learned / Improvements",
        },
      ],
    },

    {
      name: "body",
      type: "richText",
      admin: {
        description: "Optional freeform write-up beyond the structured notes.",
      },
    },
  ],
};
