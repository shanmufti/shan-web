import type { CollectionConfig } from "payload";

import { privateAccess } from "./access";

/**
 * Expenses in a split group. Written by the share page's server actions
 * (lib/actions/split.ts); amounts are integers in the currency's minor unit.
 */
export const SplitExpenses: CollectionConfig = {
  slug: "split-expenses",
  labels: { singular: "Split expense", plural: "Split expenses" },
  admin: {
    group: "Plans",
    useAsTitle: "description",
    defaultColumns: ["description", "amount", "groupId", "spentOn"],
  },
  access: privateAccess,
  defaultSort: "-createdAt",
  fields: [
    { name: "groupId", type: "number", required: true, index: true },
    { name: "description", type: "text", required: true, maxLength: 120 },
    {
      name: "amount",
      type: "number",
      required: true,
      min: 1,
      admin: {
        description: "In the currency's smallest unit (cents for USD).",
      },
    },
    {
      name: "paidBy",
      type: "text",
      required: true,
      admin: { description: "Person id from the group's people list." },
    },
    {
      name: "splitMode",
      type: "select",
      required: true,
      defaultValue: "equal",
      options: [
        { label: "Equally", value: "equal" },
        { label: "By shares", value: "shares" },
      ],
    },
    {
      name: "shares",
      type: "json",
      required: true,
      admin: { description: "[{ personId, weight }]" },
    },
    {
      name: "spentOn",
      type: "date",
      required: true,
      admin: { date: { pickerAppearance: "dayOnly" } },
    },
  ],
};
