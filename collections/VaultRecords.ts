import type { CollectionConfig } from "payload";

import {
  BILLING_PERIODS,
  VAULT_CATEGORIES,
  VAULT_CATEGORY_LABELS,
} from "@/lib/vault";

import { privateAccess } from "./access";

const NO_SECRETS =
  "Never store passwords, PINs, recovery codes or other secrets here. Reference numbers and dates only.";

/** Long-term records: documents, subscriptions, insurance, domains and so on. */
export const VaultRecords: CollectionConfig = {
  slug: "vault-records",
  labels: { singular: "Vault record", plural: "Vault records" },
  admin: {
    group: "Vault",
    useAsTitle: "title",
    defaultColumns: ["title", "category", "renewalDate", "expiryDate"],
    description: `Owner only. ${NO_SECRETS}`,
  },
  access: privateAccess,
  defaultSort: "title",
  fields: [
    { name: "title", type: "text", required: true },
    {
      type: "row",
      fields: [
        {
          name: "category",
          type: "select",
          required: true,
          defaultValue: "document",
          options: VAULT_CATEGORIES.map((value) => ({
            value,
            label: VAULT_CATEGORY_LABELS[value],
          })),
        },
        {
          name: "provider",
          type: "text",
          admin: { description: "Issuer, company or registrar." },
        },
      ],
    },
    {
      name: "referenceNumber",
      label: "Reference number",
      type: "text",
      admin: {
        description: `Policy, account, membership or document number. ${NO_SECRETS}`,
      },
    },
    {
      type: "row",
      fields: [
        { name: "cost", type: "number", min: 0 },
        {
          name: "currency",
          type: "text",
          defaultValue: "USD",
          maxLength: 3,
          admin: { description: "Three-letter code, e.g. USD, GBP, EUR." },
          validate: (value: unknown) =>
            value == null ||
            value === "" ||
            (typeof value === "string" && /^[A-Za-z]{3}$/.test(value)) ||
            "Use a three-letter currency code.",
          hooks: {
            beforeChange: [
              ({ value }: { value?: unknown }) =>
                typeof value === "string" ? value.toUpperCase() : value,
            ],
          },
        },
        {
          name: "billingPeriod",
          label: "Billing period",
          type: "select",
          options: BILLING_PERIODS.map((value) => ({
            value,
            label: value === "one-off" ? "One-off" : value,
          })),
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "startDate",
          label: "Start date",
          type: "date",
          admin: { date: { pickerAppearance: "dayOnly" } },
        },
        {
          name: "renewalDate",
          label: "Renewal date",
          type: "date",
          admin: { date: { pickerAppearance: "dayOnly" } },
        },
        {
          name: "expiryDate",
          label: "Expiry date",
          type: "date",
          admin: { date: { pickerAppearance: "dayOnly" } },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "autoRenews",
          label: "Auto-renews",
          type: "checkbox",
          defaultValue: false,
          admin: {
            description:
              "With a monthly or yearly period, the next renewal rolls forward on its own.",
          },
        },
        {
          name: "reminderLeadDays",
          label: "Reminder lead days",
          type: "number",
          defaultValue: 30,
          min: 0,
          max: 365,
          admin: {
            description: "Calendar feed reminder, this many days before.",
          },
        },
        {
          name: "archived",
          type: "checkbox",
          defaultValue: false,
          admin: {
            description:
              "No longer active. Hidden from reminders and the calendar.",
          },
        },
      ],
    },
    { name: "notes", type: "textarea" },
    {
      name: "attachments",
      type: "relationship",
      relationTo: "vault-files",
      hasMany: true,
    },
  ],
};
