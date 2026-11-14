import type { CollectionConfig } from "payload";

/**
 * Answers to group plans, one per plan + block + person (upserted on `key`).
 * Nobody can read or write these through /admin or the REST API. The only
 * reader is lib/plans.ts, which applies the sealed-vote rules before anything
 * leaves the server; writes come from lib/actions/plans.ts.
 */
const nobody = () => false;

export const PlanResponses: CollectionConfig = {
  slug: "plan-responses",
  admin: { hidden: true },
  access: {
    read: nobody,
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  fields: [
    // `${planId}:${blockId}:${participantId}`
    { name: "key", type: "text", required: true, unique: true, index: true },
    { name: "planId", type: "number", required: true, index: true },
    { name: "blockId", type: "text", required: true },
    { name: "participantId", type: "text", required: true },
    // Snapshot of the person's name when they answered.
    { name: "name", type: "text", required: true },
    { name: "value", type: "json", required: true },
  ],
};
