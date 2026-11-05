import type { GlobalConfig } from "payload";

import { hashPasscode } from "@/lib/private-access";

import { authenticated } from "./access";

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Site settings",
  admin: { group: "Settings" },
  access: {
    read: authenticated,
    update: authenticated,
  },
  hooks: {
    beforeChange: [
      async ({ data }) => {
        const next = data as {
          privatePasscode?: string | null;
          privatePasscodeHash?: string | null;
        };
        const passcode = next.privatePasscode?.trim();
        if (passcode) {
          next.privatePasscodeHash = await hashPasscode(passcode);
        }
        // Never persist the plaintext passcode.
        next.privatePasscode = null;
        return next;
      },
    ],
  },
  fields: [
    {
      name: "privatePasscode",
      label: "New private content passcode",
      type: "text",
      minLength: 4,
      admin: {
        description:
          "Type a new passcode and save to change it. Only a hash is stored, and changing it signs everyone out of private journeys and stories. Leave blank to keep the current passcode.",
      },
    },
    {
      name: "privatePasscodeHash",
      type: "text",
      admin: {
        readOnly: true,
        description:
          "Set automatically. Empty means private content is locked for everyone except you.",
      },
    },
  ],
};
