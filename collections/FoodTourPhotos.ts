import type { CollectionConfig } from "payload";

import { anyone, authenticated } from "./access";

/**
 * Photos from the food tour. Anyone with the page link can add them through
 * the form on /food-tour (server action, overrideAccess). Only you can edit
 * or delete them here. Files are re-encoded to WebP, which also strips
 * location and camera metadata.
 */
export const FoodTourPhotos: CollectionConfig = {
  slug: "food-tour-photos",
  labels: { singular: "Food tour photo", plural: "Food tour photos" },
  admin: {
    group: "Settings",
    useAsTitle: "restaurantName",
    defaultColumns: ["filename", "restaurantName", "name", "createdAt"],
  },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  defaultSort: "-createdAt",
  upload: {
    mimeTypes: ["image/*"],
    formatOptions: { format: "webp", options: { quality: 80 } },
    resizeOptions: {
      width: 2000,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    },
    imageSizes: [
      {
        name: "thumb",
        width: 640,
        height: 640,
        fit: "inside",
        withoutEnlargement: true,
        formatOptions: { format: "webp", options: { quality: 75 } },
      },
    ],
    adminThumbnail: "thumb",
  },
  fields: [
    {
      name: "restaurantId",
      type: "text",
      required: true,
      index: true,
      admin: { description: "Row id of the restaurant in Food tour settings." },
    },
    {
      name: "restaurantName",
      label: "Restaurant",
      type: "text",
      required: true,
    },
    { name: "participantId", type: "text" },
    { name: "name", label: "Added by", type: "text" },
    { name: "caption", type: "text", maxLength: 140 },
  ],
};
