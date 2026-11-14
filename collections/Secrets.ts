import type { CollectionConfig } from "payload";

const nobody = () => false;

/**
 * One-time secrets from /tools/secret. Rows hold only ciphertext encrypted in
 * the sender's browser; the key stays in the link's #fragment and never
 * reaches the server. No REST or admin access at all: rows are written and
 * burned only by the route handlers in app/(site)/tools/secret/create and
 * app/(site)/s/[id]/open (see lib/secrets.ts).
 */
export const Secrets: CollectionConfig = {
  slug: "secrets",
  admin: { hidden: true },
  access: {
    read: nobody,
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  fields: [
    {
      name: "secretId",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
    { name: "ciphertext", type: "textarea", required: true },
    { name: "iv", type: "text", required: true },
    {
      name: "salt",
      type: "text",
      admin: { description: "PBKDF2 salt when a passphrase was added." },
    },
    { name: "expiresAt", type: "date", required: true, index: true },
  ],
};
