import type { CollectionConfig } from "payload";

import { visibilityReadAccess } from "./access";
import { baseFields, optionalLocationField, visibilityFields } from "./fields";

/** Stories. Slug stays `blog` so /blog/[slug] URLs don't change. */
export const Blog: CollectionConfig = {
  slug: "blog",
  labels: { singular: "Story", plural: "Stories" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "date", "journey", "visibility", "draft"],
    group: "Journeys and stories",
  },
  access: visibilityReadAccess,
  fields: [
    ...baseFields,
    ...visibilityFields,
    {
      name: "journey",
      type: "relationship",
      relationTo: "travel",
      index: true,
      admin: {
        position: "sidebar",
        description: "Optional. Leave empty for a stand-alone story.",
      },
    },
    optionalLocationField,
  ],
};
