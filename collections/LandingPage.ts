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
    },
    {
      name: "links",
      label: "Extra links",
      type: "array",
      admin: {
        description:
          "Optional links shown under the open sections, e.g. Instagram or email.",
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
