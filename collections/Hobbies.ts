import type { Access, CollectionConfig } from "payload";

import {
  HOBBY_DESCRIPTION_PLACEHOLDER,
  HOBBY_ICONS,
} from "@/lib/hobby-options";
import { formatSlug } from "@/lib/slug";

import { authenticated } from "./access";

/** Anyone reads public hobbies; private ones only for the logged-in owner. */
// eslint-disable-next-line sonarjs/function-return-type -- Payload Access: boolean | Where
const publicHobbyOrOwner: Access = ({ req: { user } }) => {
  if (user) return true;
  return { public: { equals: true } };
};

export const Hobbies: CollectionConfig = {
  slug: "hobbies",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "public", "order"],
    group: "Hobbies",
    description:
      "One entry per hobby. Reference links and practice sessions hang off these.",
  },
  defaultSort: "order",
  access: {
    read: publicHobbyOrOwner,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: "name", type: "text", required: true, maxLength: 60 },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
        description:
          "URL: /hobbies/<slug>. Generated from the name if left blank.",
      },
      hooks: {
        beforeValidate: [
          ({ value, siblingData }) => {
            if (typeof value === "string" && value.trim() !== "") {
              return formatSlug(value);
            }
            const name: unknown = siblingData["name"];
            if (typeof name === "string") return formatSlug(name);
            return typeof value === "string" ? value : undefined;
          },
        ],
      },
    },
    {
      name: "description",
      type: "textarea",
      maxLength: 400,
      defaultValue: HOBBY_DESCRIPTION_PLACEHOLDER,
      admin: { description: "Short line shown on the hobby card and page." },
    },
    {
      name: "icon",
      type: "select",
      required: true,
      defaultValue: "sparkles",
      options: HOBBY_ICONS.map(({ value, label }) => ({ value, label })),
      admin: { description: "Lucide icon shown on the card." },
    },
    { name: "cover", type: "upload", relationTo: "media" },
    {
      name: "sectionHref",
      label: "Related section page",
      type: "text",
      admin: {
        description:
          "Optional link to an existing part of the site, e.g. /diving. Shown only to visitors who can open it.",
      },
      validate: (value: unknown) =>
        value == null ||
        value === "" ||
        (typeof value === "string" && /^\/(?!\/)/.test(value)) ||
        "Use a site path that starts with /, e.g. /diving",
    },
    {
      name: "public",
      type: "checkbox",
      defaultValue: true,
      admin: {
        position: "sidebar",
        description:
          "Off: only you (logged in) see this hobby and everything in it.",
      },
    },
    {
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: { position: "sidebar", description: "Lower comes first." },
    },
  ],
};
