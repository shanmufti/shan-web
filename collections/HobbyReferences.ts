import type { Access, CollectionConfig } from "payload";

import {
  REFERENCE_KINDS,
  REFERENCE_STATUSES,
  SKILL_LEVELS,
} from "@/lib/hobby-options";
import {
  fallbackTitle,
  fetchLinkMetadata,
  parseHttpUrl,
} from "@/lib/link-metadata";

import { authenticated } from "./access";

/**
 * Anyone reads public references of public hobbies; everything else only
 * for the logged-in owner.
 */
// eslint-disable-next-line sonarjs/function-return-type -- Payload Access: boolean | Where
const publicReferenceOrOwner: Access = ({ req: { user } }) => {
  if (user) return true;
  return {
    and: [{ public: { equals: true } }, { "hobby.public": { equals: true } }],
  };
};

const toOptions = (options: readonly { value: string; label: string }[]) =>
  options.map(({ value, label }) => ({ value, label }));

function isBlank(value: unknown) {
  return value == null || (typeof value === "string" && value.trim() === "");
}

export const HobbyReferences: CollectionConfig = {
  slug: "hobby-references",
  labels: { singular: "Hobby reference", plural: "Hobby references" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "hobby", "topic", "kind", "status", "public"],
    group: "Hobbies",
    description:
      "Videos, guides and articles per hobby. Leave title, thumbnail and provider blank to fill them from the link when saving.",
  },
  defaultSort: "-createdAt",
  access: {
    read: publicReferenceOrOwner,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    beforeValidate: [
      // Auto-fill from YouTube/Vimeo oEmbed or Open Graph tags. Runs on create
      // and whenever the URL changes; never overwrites a value already set.
      async ({ data, originalDoc, operation }) => {
        if (!data) return data;
        const original = (originalDoc ?? {}) as Record<string, unknown>;
        const url: unknown = data["url"] ?? original["url"];
        if (typeof url !== "string" || !parseHttpUrl(url)) return data;
        const urlChanged =
          operation === "create" || data["url"] !== original["url"];
        const merged: Record<string, unknown> = { ...original, ...data };
        const needs = ["title", "thumbnailUrl", "provider", "kind"].some((k) =>
          isBlank(merged[k]),
        );
        if (!urlChanged || !needs) return data;

        const meta = await fetchLinkMetadata(url);
        const fill = (key: string, value: unknown) => {
          if (value !== undefined && isBlank(merged[key])) data[key] = value;
        };
        fill("title", meta.title ?? fallbackTitle(url));
        fill("thumbnailUrl", meta.thumbnailUrl);
        fill("provider", meta.provider);
        fill("kind", meta.isVideo ? "video" : "article");
        if (merged["startSeconds"] == null) {
          fill("startSeconds", meta.startSeconds);
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "hobby",
      type: "relationship",
      relationTo: "hobbies",
      required: true,
      index: true,
    },
    {
      name: "url",
      label: "URL",
      type: "text",
      required: true,
      validate: (value: unknown) =>
        (typeof value === "string" && parseHttpUrl(value) !== null) ||
        "Enter a full http(s) link",
    },
    {
      name: "title",
      type: "text",
      required: true,
      maxLength: 200,
      admin: { description: "Filled from the link if left blank." },
    },
    {
      name: "topic",
      type: "text",
      maxLength: 60,
      admin: {
        description:
          "Free text used to group the list, e.g. Footwork. Reuse the same spelling.",
      },
    },
    {
      name: "kind",
      type: "select",
      required: true,
      options: toOptions(REFERENCE_KINDS),
      admin: {
        description:
          "If left blank: Video for YouTube/Vimeo links, otherwise Article.",
      },
    },
    {
      name: "skillLevel",
      type: "select",
      options: toOptions(SKILL_LEVELS),
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "to-watch",
      options: toOptions(REFERENCE_STATUSES),
    },
    {
      name: "startSeconds",
      label: "Start time (seconds)",
      type: "number",
      min: 0,
      admin: {
        description:
          "Videos only. Read from the link's t= value if present, e.g. 90 for 1:30.",
      },
    },
    {
      name: "thumbnailUrl",
      label: "Thumbnail URL",
      type: "text",
      validate: (value: unknown) =>
        isBlank(value) ||
        (typeof value === "string" && parseHttpUrl(value) !== null) ||
        "Enter a full http(s) link",
    },
    { name: "provider", type: "text", maxLength: 80 },
    {
      name: "note",
      label: "My note",
      type: "textarea",
      maxLength: 1000,
    },
    {
      name: "public",
      type: "checkbox",
      defaultValue: true,
      admin: {
        position: "sidebar",
        description:
          "Off: only you see it. A reference of a private hobby is private either way.",
      },
    },
  ],
};
