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
  // Newest trip first in /admin, matching the public journeys list.
  defaultSort: "-startDate",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "startDate", "visibility", "draft"],
    group: "Journeys",
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
      // GPS route as line segments: [[[lat, lng], ...], ...]. Written by
      // scripts/import-tracks.mjs from a Polarsteps export, already
      // simplified and rounded. Hidden in the admin because it is large.
      name: "track",
      type: "json",
      admin: { hidden: true },
    },
    {
      name: "photos",
      type: "array",
      admin: {
        description:
          "Photo gallery, in display order. Set Stop to a stop's name to group photos under it. The cover stays in Cover.",
        initCollapsed: true,
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "image",
              type: "upload",
              relationTo: "media",
            },
            {
              name: "stop",
              type: "text",
              admin: { description: "Matches a stop's name, e.g. Oaxaca." },
            },
          ],
        },
      ],
    },
    {
      name: "relatedDiveLogs",
      type: "relationship",
      relationTo: "diving",
      hasMany: true,
    },
  ],
};
