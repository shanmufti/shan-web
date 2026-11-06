import { APIError, type GlobalConfig } from "payload";

import { anyone, authenticated } from "./access";

/**
 * The food tour: restaurant list and reveal date. Rubrics themselves live in
 * the sealed `food-ratings` collection.
 *
 * Once anyone has submitted a rubric, the reveal date can only move later,
 * so it can't be pulled forward to peek early.
 */
export const FoodTour: GlobalConfig = {
  slug: "food-tour",
  label: "Food tour",
  admin: { group: "Settings" },
  access: {
    read: anyone,
    update: authenticated,
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const next = data as { revealAt?: string | null };
        const prev = (originalDoc ?? {}) as { revealAt?: string | null };
        if (!prev.revealAt) return next;

        const movedEarlier =
          !next.revealAt ||
          new Date(next.revealAt).getTime() < new Date(prev.revealAt).getTime();
        if (!movedEarlier) return next;

        const { totalDocs } = await req.payload.count({
          collection: "food-ratings",
          overrideAccess: true,
        });
        if (totalDocs > 0) {
          throw new APIError(
            "Rubrics have already been submitted, so the reveal date can only move later.",
            400,
            undefined,
            true,
          );
        }
        return next;
      },
    ],
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      defaultValue: "Food tour",
    },
    {
      name: "intro",
      type: "textarea",
      admin: { description: "Optional note shown above the form." },
    },
    {
      name: "revealAt",
      label: "Reveal date",
      type: "date",
      required: true,
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        description:
          "Results unlock for everyone (you included) at this moment. Submissions close then too. Once a rubric is in, this can only move later.",
      },
    },
    {
      name: "acceptingRatings",
      label: "Accepting rubrics",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description: "Untick to pause submissions before the reveal date.",
      },
    },
    {
      name: "participants",
      label: "People",
      type: "array",
      admin: {
        description:
          "Everyone on the tour. They pick their name from this list. Don't delete someone who has submitted — rename instead.",
      },
      fields: [{ name: "name", type: "text", required: true }],
    },
    {
      name: "restaurants",
      type: "array",
      admin: {
        description:
          "Add each stop. Don't delete one that has rubrics — rename it instead.",
      },
      fields: [
        { name: "name", type: "text", required: true },
        {
          type: "row",
          fields: [
            {
              name: "cuisine",
              type: "text",
              admin: { placeholder: "e.g. Szechuan, Neapolitan pizza" },
            },
            {
              name: "chosenBy",
              label: "Chosen by",
              type: "text",
              admin: { description: "Name from People above." },
              validate: (
                value: string | null | undefined,
                { data }: { data: unknown },
              ) => {
                if (!value?.trim()) return true;
                const people =
                  (data as { participants?: { name?: string | null }[] | null })
                    .participants ?? [];
                const match = people.some(
                  (p) =>
                    p.name?.trim().toLowerCase() === value.trim().toLowerCase(),
                );
                return match || "Use a name from People.";
              },
            },
          ],
        },
        { name: "neighbourhood", type: "text" },
        { name: "visitedOn", type: "date" },
      ],
    },
  ],
};
