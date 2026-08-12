import type { CollectionConfig } from "payload";

import { authenticated } from "./access";

export const Media: CollectionConfig = {
  slug: "media",
  access: {
    // Public site needs to load images; uploads stay admin-only.
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
    },
  ],
  upload: true,
};
