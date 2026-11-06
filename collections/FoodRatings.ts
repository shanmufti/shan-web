import type { CollectionConfig } from "payload";

/**
 * Sealed food tour rubrics. Nobody can read, edit or delete these through
 * /admin or the REST API — not even a logged-in admin. The only reader is
 * lib/food-tour.ts, which uses overrideAccess and refuses to query until the
 * tour's reveal date has passed. Writes come from the public form's server
 * action (lib/actions/submit-food-rating.ts), also with overrideAccess.
 */
const nobody = () => false;

const score = (name: string) => ({
  name,
  type: "number" as const,
  required: true,
  min: 1,
  max: 5,
});

export const FoodRatings: CollectionConfig = {
  slug: "food-ratings",
  admin: { hidden: true },
  access: {
    read: nobody,
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  fields: [
    // `${restaurantId}:${normalized name}` — one rubric per person per place.
    { name: "key", type: "text", required: true, unique: true, index: true },
    { name: "name", type: "text", required: true, maxLength: 40 },
    { name: "restaurantId", type: "text", required: true, index: true },
    { name: "restaurantName", type: "text", required: true },
    score("food"),
    score("ambiance"),
    score("price"),
    score("again"),
    { name: "total", type: "number", required: true },
    { name: "comment", type: "textarea", maxLength: 500 },
  ],
};
