import type { CollectionConfig } from "payload";

import { visibilityReadAccess } from "./access";
import { slugField, visibilityFields } from "./fields";

/**
 * One page per place visited, at /travel/places/[slug]. A destination is a
 * place (a city, an island), not a trip: Journeys (`travel`) stay the trips,
 * and a destination links to the journeys that passed through it. Saved
 * Google Maps places hang off a destination (see Places).
 */
export const Destinations: CollectionConfig = {
  slug: "destinations",
  labels: { singular: "Destination", plural: "Destinations" },
  defaultSort: "title",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "country", "draft", "visibility"],
    group: "Journeys and stories",
    description:
      "One page per place, at /travel/places/<slug>. Usually created by the Google Maps importer (see README). The whole section is gated by Settings → Access → Places.",
  },
  access: visibilityReadAccess,
  fields: [
    { name: "title", type: "text", required: true, maxLength: 99 },
    slugField,
    {
      name: "draft",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description:
          "Drafts are visible only to you while logged in. The importer creates new destinations as drafts.",
      },
    },
    ...visibilityFields,
    {
      name: "country",
      type: "text",
      minLength: 3,
      maxLength: 3,
      admin: {
        description:
          "ISO 3166-1 alpha-3, e.g. MEX, PER. Same codes as journey stops and visited countries.",
      },
    },
    {
      name: "coordinates",
      type: "group",
      admin: {
        description:
          "Centre of the map. The importer fills this with the middle of the saved places when empty.",
      },
      fields: [
        {
          type: "row",
          fields: [
            { name: "lat", type: "number", min: -90, max: 90 },
            { name: "lng", type: "number", min: -180, max: 180 },
          ],
        },
      ],
    },
    {
      name: "datesVisited",
      type: "array",
      admin: {
        description:
          "One row per stay. scripts/ics-trip-dates.ts can suggest these from a calendar export.",
        initCollapsed: true,
      },
      fields: [
        {
          type: "row",
          fields: [
            { name: "from", type: "date", required: true },
            { name: "to", type: "date" },
          ],
        },
        { name: "note", type: "text" },
      ],
    },
    { name: "cover", type: "upload", relationTo: "media" },
    {
      name: "writeUp",
      label: "Write-up",
      type: "richText",
      admin: {
        description:
          "Main text of the page. While empty, the page shows a placeholder (to you only, as long as the destination is a draft).",
      },
    },
    {
      name: "journeys",
      type: "relationship",
      relationTo: "travel",
      hasMany: true,
      admin: { description: "Journeys that passed through this place." },
    },
    {
      name: "sourceLists",
      type: "text",
      hasMany: true,
      admin: {
        position: "sidebar",
        description:
          "Google Maps list names that feed this destination. The importer matches lists to destinations by these names.",
      },
    },
    {
      name: "importedNotes",
      type: "textarea",
      admin: {
        description:
          "Raw Google Maps list description from the import. Never shown on the site: copy what you want into Write-up after editing out anything personal.",
      },
    },
    {
      name: "places",
      type: "join",
      collection: "places",
      on: "destination",
      admin: { description: "Saved places on this destination's page." },
    },
  ],
};
