import type { CollectionConfig } from "payload";

import { publicReadAccess } from "./access";

export const Media: CollectionConfig = {
  slug: "media",
  access: publicReadAccess,
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
    },
  ],
  upload: true,
};
