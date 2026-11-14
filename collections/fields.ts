import type { Field } from "payload";

import { formatSlug } from "@/lib/slug";

const slugField: Field = {
  name: "slug",
  type: "text",
  required: true,
  unique: true,
  index: true,
  admin: {
    description:
      "Auto-generated from the title if left blank. Only lowercase letters, numbers, and hyphens are kept.",
  },
  hooks: {
    beforeValidate: [
      ({ value, siblingData }) => {
        if (typeof value === "string" && value.trim() !== "") {
          return formatSlug(value);
        }

        const title: unknown = siblingData["title"];
        if (typeof title === "string" && title.trim() !== "") {
          return formatSlug(title);
        }

        return typeof value === "string" ? value : undefined;
      },
    ],
  },
};

export { slugField };

export const baseFields: Field[] = [
  { name: "title", type: "text", required: true, maxLength: 99 },
  slugField,
  { name: "date", type: "date", required: true },
  { name: "summary", type: "textarea", required: true, maxLength: 280 },
  { name: "tags", type: "text", hasMany: true },
  { name: "cover", type: "upload", relationTo: "media" },
  { name: "draft", type: "checkbox", defaultValue: false },
  { name: "featured", type: "checkbox", defaultValue: false },
  { name: "body", type: "richText", required: true },
];

export const locationField: Field = {
  name: "location",
  type: "group",
  fields: [
    { name: "name", type: "text", required: true },
    { name: "lat", type: "number", min: -90, max: 90 },
    { name: "lng", type: "number", min: -180, max: 180 },
  ],
};

/**
 * Public vs passcode-protected. Private items show as locked cards in
 * listings unless `hideWhenLocked` is set. See lib/private-access.ts.
 */
export const visibilityFields: Field[] = [
  {
    name: "visibility",
    type: "select",
    required: true,
    defaultValue: "public",
    options: [
      { label: "Public", value: "public" },
      { label: "Private (passcode)", value: "private" },
    ],
    admin: {
      position: "sidebar",
      description:
        "Private needs the site passcode (Settings → Site settings). Use only private photos inside private posts.",
    },
  },
  {
    name: "hideWhenLocked",
    label: "Hide from listings when locked",
    type: "checkbox",
    defaultValue: false,
    admin: {
      position: "sidebar",
      condition: (_, siblingData) =>
        (siblingData as { visibility?: string }).visibility === "private",
      description:
        "Off: visitors see a locked card with title and date. On: the item is invisible until unlocked.",
    },
  },
];
