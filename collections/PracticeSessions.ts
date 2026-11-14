import type { CollectionConfig } from "payload";

import { privateAccess } from "./access";

/** Owner-only practice log, one entry per session. */
export const PracticeSessions: CollectionConfig = {
  slug: "practice-sessions",
  labels: { singular: "Practice session", plural: "Practice sessions" },
  admin: {
    useAsTitle: "focus",
    defaultColumns: ["date", "hobby", "focus", "durationMinutes", "feeling"],
    group: "Hobbies",
    description: "Private log. Only you, logged in, can see these.",
  },
  defaultSort: "-date",
  access: privateAccess,
  fields: [
    {
      name: "hobby",
      type: "relationship",
      relationTo: "hobbies",
      required: true,
      index: true,
    },
    {
      name: "date",
      type: "date",
      required: true,
      index: true,
      admin: { date: { pickerAppearance: "dayOnly" } },
    },
    {
      name: "durationMinutes",
      label: "Duration (minutes)",
      type: "number",
      min: 0,
      max: 1440,
    },
    { name: "location", type: "text", maxLength: 120 },
    {
      name: "focus",
      label: "Focus / what I worked on",
      type: "text",
      required: true,
      maxLength: 200,
    },
    {
      name: "references",
      label: "References used",
      type: "relationship",
      relationTo: "hobby-references",
      hasMany: true,
      filterOptions: ({ siblingData }) => {
        const hobby = (siblingData as { hobby?: unknown }).hobby;
        return hobby ? { hobby: { equals: hobby } } : true;
      },
    },
    {
      name: "feeling",
      label: "How it felt (1-5)",
      type: "number",
      min: 1,
      max: 5,
    },
    { name: "notes", type: "textarea", maxLength: 2000 },
  ],
};
