import type { GlobalConfig } from "payload";

import { newToken } from "@/lib/tokens";

import { authenticated } from "./access";

export const VaultSettings: GlobalConfig = {
  slug: "vault-settings",
  label: "Vault settings",
  admin: {
    group: "Vault",
    description:
      "The calendar feed at /vault/calendar.ics?token=… lists renewals and expiries with reminders. Anyone with the full link can read titles and dates, so keep it private.",
  },
  access: {
    read: authenticated,
    update: authenticated,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        const next = data as {
          calendarToken?: string | null;
          regenerateCalendarToken?: boolean | null;
        };
        if (next.regenerateCalendarToken || !next.calendarToken) {
          next.calendarToken = newToken();
        }
        next.regenerateCalendarToken = false;
        return next;
      },
    ],
  },
  fields: [
    {
      name: "calendarToken",
      label: "Calendar feed token",
      type: "text",
      admin: {
        readOnly: true,
        description:
          "Set automatically. The full feed link is shown on /vault.",
      },
    },
    {
      name: "regenerateCalendarToken",
      label: "Regenerate token on save",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Tick and save to make a new token. The old feed link stops working, so re-subscribe on your devices.",
      },
    },
  ],
};
