import type { Access, CollectionConfig } from "payload";

import { PLACE_CATEGORIES } from "@/lib/google-maps-takeout";

import { authenticated } from "./access";

/**
 * Anonymous REST/Local API readers get public places of published, public
 * destinations only. Pages read with overrideAccess and filter per viewer
 * (lib/places.ts).
 */
// eslint-disable-next-line sonarjs/function-return-type -- Payload Access: boolean | Where
const readPlaces: Access = ({ req: { user } }) => {
  if (user) return true;
  return {
    and: [
      { visibility: { equals: "public" } },
      { "destination.draft": { equals: false } },
      { "destination.visibility": { equals: "public" } },
    ],
  };
};

/**
 * Saved places (mostly from Google Maps lists), shown on a destination page
 * as a map and a list grouped by category.
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
    read: readPlaces,
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
          "Your recommendation, shown on the page. Re-imports only fill this when it's empty.",
      },
    },
    {
      name: "coordinates",
      type: "group",
      admin: {
        description: "Places without coordinates show in the list only.",
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
          "Who sees this place on the destination page. Use Only me for anything personal, like a friend's home.",
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
