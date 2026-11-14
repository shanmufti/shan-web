import type { Field, GlobalConfig } from "payload";

import {
  ACCESS_MODE_LABELS,
  ACCESS_MODES,
  SITE_SECTIONS,
  type SiteSection,
} from "@/lib/site-sections";

import { authenticated } from "./access";

const modeOptions = ACCESS_MODES.map((value) => ({
  value,
  label: ACCESS_MODE_LABELS[value],
}));

const sectionFields: Field[] = SITE_SECTIONS.map(
  (section: SiteSection): Field => ({
    name: section.key,
    label: `${section.label} (${section.paths.join(", ")})`,
    type: "select",
    required: true,
    defaultValue: section.defaultMode,
    options: section.ownerOnly
      ? modeOptions.filter((o) => o.value === "owner")
      : modeOptions,
    ...(section.ownerOnly
      ? {
          admin: {
            description: section.tokenPaths?.some((p) => p.endsWith("/*"))
              ? "Always hidden: only you, logged in. Share links still open for anyone who has them."
              : "Always hidden: only you, logged in.",
            readOnly: true,
          },
        }
      : {}),
  }),
);

/**
 * The retired Places section (/travel/places; saved places now show on
 * journey pages). Its column stays, hidden and unused, so removing the
 * section needed no database change. Drop it with a migration when one is
 * next written. Kept in its old position so generated types don't move.
 */
const retiredPlacesField: Field = {
  name: "places",
  type: "select",
  required: true,
  defaultValue: "owner",
  options: modeOptions,
  admin: { hidden: true },
};

const packingIndex = sectionFields.findIndex(
  (f) => "name" in f && f.name === "packing",
);
sectionFields.splice(packingIndex + 1, 0, retiredPlacesField);

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
  fields: [
    {
      name: "sections",
      type: "group",
      label: "Sections",
      fields: sectionFields,
    },
  ],
};
