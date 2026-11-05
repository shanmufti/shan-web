import type { CollectionConfig } from "payload";

import { visibilityReadAccess } from "./access";
import { baseFields, visibilityFields } from "./fields";

/**
 * Journeys. Slug stays `travel` so URLs (/travel/[slug]) and existing rows
 * don't change; only the admin labels say "Journeys".
 */
export const Travel: CollectionConfig = {
  slug: "travel",
  labels: { singular: "Journey", plural: "Journeys" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "startDate", "visibility", "draft"],
    group: "Journeys and stories",
  },
  access: visibilityReadAccess,
  fields: [
    ...baseFields,
    ...visibilityFields,
    {
      name: "location",
      type: "group",
      admin: {
        description:
          "Main place for this journey (used where one point is needed). Add the full route under Stops.",
      },
      fields: [
        { name: "name", type: "text", required: true },
        { name: "lat", type: "number", min: -90, max: 90 },
        { name: "lng", type: "number", min: -180, max: 180 },
      ],
    },
    { name: "startDate", type: "date", required: true },
    { name: "endDate", type: "date" },
    {
      name: "stops",
      type: "array",
      admin: {
        description:
          "Route in travel order. Drives the globe pins and arcs and the journey map.",
        initCollapsed: true,
      },
      fields: [
        { name: "name", type: "text", required: true },
        {
          name: "countryCode",
          type: "text",
          minLength: 3,
          maxLength: 3,
          admin: {
            description: "ISO 3166-1 alpha-3, e.g. MEX, THA, CAN.",
          },
        },
        {
          type: "row",
          fields: [
            { name: "lat", type: "number", required: true, min: -90, max: 90 },
            {
              name: "lng",
              type: "number",
              required: true,
              min: -180,
              max: 180,
            },
          ],
        },
        { name: "arrivedOn", type: "date" },
      ],
    },
    {
      name: "relatedDiveLogs",
      type: "relationship",
      relationTo: "diving",
      hasMany: true,
    },
    {
      name: "stories",
      type: "join",
      collection: "blog",
      on: "journey",
      admin: { description: "Stories that belong to this journey." },
    },
  ],
};
