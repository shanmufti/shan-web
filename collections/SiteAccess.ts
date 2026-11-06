import type { Field, GlobalConfig } from "payload";

import { clearAccessCache } from "@/lib/section-modes";
import {
  ACCESS_MODE_LABELS,
  ACCESS_MODES,
  SITE_SECTIONS,
} from "@/lib/site-sections";

import { authenticated } from "./access";

const modeOptions = ACCESS_MODES.map((value) => ({
  value,
  label: ACCESS_MODE_LABELS[value],
}));

const sectionFields: Field[] = SITE_SECTIONS.map((section) => ({
  name: section.key,
  label: `${section.label} (${section.paths.join(", ")})`,
  type: "select",
  required: true,
  defaultValue: section.defaultMode,
  options: modeOptions,
}));

/**
 * Who can see each section of the site. Changes apply within seconds, no
 * deploy needed. The landing page (/) and /unlock are always public; logged-in
 * admins can always see everything.
 */
export const SiteAccess: GlobalConfig = {
  slug: "site-access",
  label: "Access & permissions",
  admin: {
    group: "Settings",
    description:
      "Choose who can see each section. Public: anyone. Passcode: visitors who enter the private passcode set in Site settings. Hidden: only you while logged in; everyone else gets a 404. The landing page is always public.",
  },
  access: {
    read: authenticated,
    update: authenticated,
  },
  hooks: {
    afterChange: [
      () => {
        clearAccessCache();
      },
    ],
  },
  fields: [
    {
      name: "sections",
      type: "group",
      label: "Sections",
      fields: sectionFields,
    },
  ],
};
