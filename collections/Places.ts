import type { CollectionConfig } from "payload";

import { PLACE_CATEGORIES } from "@/lib/google-maps-takeout";

import { authenticated } from "./access";

/**
 * Saved places (mostly from Google Maps lists), shown under "Places I saved"
 * on every journey their destination links to. Only the logged-in owner can
 * read them through the REST API; journey pages read with overrideAccess
 * and filter per viewer (lib/places.ts).
 */
export const Places: CollectionConfig = {
  slug: "places",
  labels: { singular: "Place", plural: "Places" },
  defaultSort: "name",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "category", "destination", "visibility"],
    group: "Journeys and stories",
    listSearchableFields: ["name", "sourceList", "address"],
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "destination",
      type: "relationship",
      relationTo: "destinations",
      required: true,
      index: true,
    },
    {
      name: "category",
      type: "select",
      required: true,
      defaultValue: "other",
      options: PLACE_CATEGORIES.map((c) => ({ ...c })),
      admin: {
        description:
          "The importer guesses from the name on first import and never changes it after.",
      },
    },
    {
      name: "note",
      label: "My note",
      type: "textarea",
      admin: {
        description:
          "Your recommendation, shown under the place on journey pages. Re-imports only fill this when it's empty.",
      },
    },
    {
      name: "coordinates",
      type: "group",
      admin: {
        description: "Optional. Not shown on the site.",
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
    { name: "address", type: "text" },
    { name: "googleMapsUrl", label: "Google Maps URL", type: "text" },
    {
      name: "visibility",
      type: "select",
      required: true,
      defaultValue: "public",
      options: [
        { label: "Public", value: "public" },
        { label: "Private (passcode)", value: "private" },
        { label: "Only me", value: "owner" },
      ],
      admin: {
        position: "sidebar",
        description:
          "Who sees this place on the journey pages it appears on. A private destination makes all its places at least private. Use Only me for anything personal, like a friend's home.",
      },
    },
    {
      name: "sourceList",
      type: "text",
      admin: {
        position: "sidebar",
        readOnly: true,
        description:
          "Google Maps list(s) this came from. Not shown on the site.",
      },
    },
    {
      name: "importKey",
      type: "text",
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
        readOnly: true,
        description:
          "Set by the importer (Google place id, or name + coordinates) so re-runs update instead of duplicating.",
      },
    },
  ],
};
