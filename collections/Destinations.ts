import type { CollectionConfig } from "payload";

import { authenticated } from "./access";
import { slugField, visibilityFields } from "./fields";

/**
 * A place visited (a city, an island), not a trip: Journeys (`travel`) stay
 * the trips, and a destination links to the journeys that passed through it.
 * Saved Google Maps places hang off a destination (see Places) and show on
 * those journeys' pages; there is no page per destination. Only the
 * logged-in owner can read destinations through the REST API.
 */
export const Destinations: CollectionConfig = {
  slug: "destinations",
  labels: { singular: "Destination", plural: "Destinations" },
  defaultSort: "title",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "country", "draft", "visibility"],
    group: "Journeys",
    description:
      'Groups saved Google Maps places, usually created by the importer (see README). Link a destination to its journeys and its places show under "Places I saved" on those journey pages.',
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
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
          "The importer creates new destinations as drafts. It doesn't hide anything on the site: places show on linked journeys either way.",
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
          "The importer fills this with the middle of the saved places when empty.",
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
          "Not shown on the site for now (there is no page per destination).",
      },
    },
    {
      name: "journeys",
      type: "relationship",
      relationTo: "travel",
      hasMany: true,
      admin: {
        description:
          "Journeys that passed through this place. Its saved places show on each of these journey pages.",
      },
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
          "Raw Google Maps list description from the import. Never shown on the site.",
      },
    },
    {
      name: "places",
      type: "join",
      collection: "places",
      on: "destination",
      admin: {
        description: "Saved places, shown on the linked journeys' pages.",
      },
    },
  ],
};
