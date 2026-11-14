import type { CollectionConfig } from "payload";

import { privateAccess } from "./access";

/**
 * Failed passcode attempts per visitor (hashed IP), for rate limiting the
 * /unlock form. Written only by the server action with overrideAccess.
 * lib/rate-limit.ts also keeps other counters here under prefixed keys
 * (e.g. "secret:<hash>" for new one-time secrets).
 */
export const UnlockAttempts: CollectionConfig = {
  slug: "unlock-attempts",
  admin: { hidden: true },
  access: privateAccess,
  fields: [
    { name: "key", type: "text", required: true, unique: true, index: true },
    { name: "count", type: "number", required: true, defaultValue: 0 },
    { name: "windowStart", type: "date", required: true },
  ],
};
