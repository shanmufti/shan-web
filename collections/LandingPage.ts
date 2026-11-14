import type { GlobalConfig } from "payload";

import { anyone, authenticated } from "./access";

/** Content for the public landing page at /. */
export const LandingPage: GlobalConfig = {
  slug: "landing-page",
  label: "Landing page",
  admin: {
    group: "Settings",
    description:
      "The public home page. Sections you open to visitors in Access & permissions are listed on it automatically.",
  },
  access: {
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: "eyebrow",
      type: "text",
    },
    {
      name: "headline",
      type: "text",
      required: true,
      defaultValue: "Shan Mufti",
    },
    {
      name: "intro",
      type: "textarea",
      admin: {
        description:
          "Shown under your name at the top of the home page. Empty shows a marked placeholder.",
      },
    },
    {
      name: "now",
      label: "Now",
      type: "group",
      admin: {
        description:
          "The home page's Now tile: what you're working on or learning this month.",
      },
      fields: [
        {
          name: "text",
          type: "textarea",
          maxLength: 280,
          admin: {
            description:
              "A line or two. Empty shows a marked placeholder on the home page.",
          },
        },
        {
          name: "updated",
          label: "Updated",
          type: "date",
          admin: {
            date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" },
            description: "Shown as “Updated <date>” under the text.",
          },
        },
      ],
    },
    {
      name: "links",
      label: "Extra links",
      type: "array",
      admin: {
        description:
          "Shown in the home page's Elsewhere tile, e.g. Instagram or email.",
      },
      fields: [
        { name: "label", type: "text", required: true },
        {
          name: "href",
          label: "URL",
          type: "text",
          required: true,
          admin: {
            description: "https://…, mailto:…, or a path like /food-tour",
          },
        },
        { name: "description", type: "text" },
      ],
    },
  ],
};
