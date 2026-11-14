import type { GlobalConfig, TextFieldSingleValidation } from "payload";

import { isValidTimeZone } from "@/lib/call-planner";

import { authenticated } from "./access";

const validateTimeZone: TextFieldSingleValidation = (value) =>
  typeof value === "string" && isValidTimeZone(value)
    ? true
    : "Use an IANA time zone name such as Europe/London or Asia/Karachi.";

/**
 * People shown on /tools/call-times. Only you can read or edit this through
 * the API; the page reads it on the server after the section's access check.
 */
export const CallPlanner: GlobalConfig = {
  slug: "call-planner",
  label: "Call planner",
  admin: {
    group: "Tools",
    description:
      "People shown on /tools/call-times with their local time and overlapping waking hours. Who can open the page is set in Settings → Access (Call times).",
  },
  access: {
    read: authenticated,
    update: authenticated,
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "wakeStart",
          label: "Waking hours start (hour)",
          type: "number",
          min: 0,
          max: 23,
          defaultValue: 8,
          required: true,
        },
        {
          name: "wakeEnd",
          label: "Waking hours end (hour)",
          type: "number",
          min: 1,
          max: 24,
          defaultValue: 22,
          required: true,
          admin: { description: "22 means awake until 22:00." },
        },
      ],
    },
    {
      name: "people",
      type: "array",
      labels: { singular: "Person", plural: "People" },
      fields: [
        {
          type: "row",
          fields: [
            { name: "name", type: "text", required: true, maxLength: 60 },
            { name: "city", type: "text", maxLength: 80 },
            {
              name: "timeZone",
              label: "Time zone",
              type: "text",
              required: true,
              validate: validateTimeZone,
              admin: {
                description: "IANA name, e.g. America/New_York, Asia/Karachi.",
              },
            },
          ],
        },
      ],
    },
  ],
};
