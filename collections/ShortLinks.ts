import type { CollectionConfig } from "payload";

import { validateDestination, validateShortLinkSlug } from "@/lib/short-links";

import { privateAccess } from "./access";

/**
 * Link shortener: /go/<slug> redirects (307) to `destination`.
 * Owner-only in /admin and the REST API; the redirect route reads the table
 * directly and bumps `clicks` in the same SQL statement.
 */
export const ShortLinks: CollectionConfig = {
  slug: "short-links",
  labels: { singular: "Short link", plural: "Short links" },
  admin: {
    useAsTitle: "slug",
    defaultColumns: [
      "slug",
      "destination",
      "active",
      "clicks",
      "lastClickedAt",
    ],
    group: "Settings",
    description:
      "Each link redirects from /go/<slug>. Inactive or unknown slugs show the 404 page.",
  },
  access: privateAccess,
  fields: [
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      validate: (value: unknown) => validateShortLinkSlug(value),
      admin: {
        description:
          "Lowercase letters, digits and hyphens. The link is /go/<slug>.",
      },
    },
    {
      name: "destination",
      type: "text",
      required: true,
      validate: (value: unknown) => validateDestination(value),
      admin: { description: "Full http:// or https:// URL." },
    },
    {
      name: "note",
      type: "textarea",
      admin: { description: "Private note, shown only here." },
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
      admin: { position: "sidebar" },
    },
    {
      name: "clicks",
      type: "number",
      defaultValue: 0,
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      name: "lastClickedAt",
      type: "date",
      admin: {
        readOnly: true,
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;
        const { slug, destination } = data as {
          slug?: unknown;
          destination?: unknown;
        };
        if (typeof slug === "string") data["slug"] = slug.trim().toLowerCase();
        if (typeof destination === "string") {
          data["destination"] = destination.trim();
        }
        return data;
      },
    ],
  },
};
