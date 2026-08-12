import type { Field } from "payload";

function formatSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
        const source =
          typeof value === "string" && value.trim()
            ? value
            : typeof siblingData?.title === "string"
              ? siblingData.title
              : undefined;
        return source ? formatSlug(source) : value;
      },
    ],
  },
};

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
    { name: "lat", type: "number", required: true, min: -90, max: 90 },
    { name: "lng", type: "number", required: true, min: -180, max: 180 },
  ],
};
