import type { CollectionConfig, GlobalConfig } from "payload";

/**
 * One place that decides how /admin's sidebar looks: which group each
 * collection and global sits in, its sidebar name, the one-line note at the
 * top of its list page, and the order.
 *
 * It only changes admin labels, never slugs, fields or data, so it is safe to
 * edit. Anything not listed here keeps the group and labels from its own
 * config file and shows after the groups below, before "Not in use yet".
 *
 * To bring a feature back into use, move its entry out of NOT_IN_USE.
 */

export const ADMIN_GROUPS = {
  travel: "Travel",
  diving: "Diving",
  foodTour: "Food tour",
  site: "Site",
  notInUse: "Not in use yet",
} as const;

interface AdminEntry {
  /** Sidebar group. `false` keeps the page reachable but out of the sidebar. */
  group: string | false;
  /** Sidebar name (plural for collections). */
  label?: string;
  /** Singular name, for "Create new …" buttons. */
  singular?: string;
  /** Plain-language note shown at the top of the list or settings page. */
  description?: string;
}

const NOT_IN_USE_NOTE =
  "Not in use yet: nothing is saved here and the page isn't on the site. It's kept so you can start using it later.";

/** Order here is the sidebar order. */
const LAYOUT: Record<string, AdminEntry> = {
  // Travel
  travel: {
    group: ADMIN_GROUPS.travel,
    label: "Journeys",
    singular: "Journey",
    description:
      "Your trips. Each journey is a page under /travel with its route map, stops, photos and saved places.",
  },
  destinations: {
    group: ADMIN_GROUPS.travel,
    description:
      'Cities and areas from your Google Maps lists. Link one to a journey and its places show under "Places I saved" on that journey page.',
  },
  places: {
    group: ADMIN_GROUPS.travel,
    description:
      "Spots saved from Google Maps, each under a destination. To tidy many at once: filter by Destination or Category, tick the rows, then Edit (or Delete). Practical places (laundry, rentals, addresses) are Only me.",
  },
  "visited-countries": {
    group: ADMIN_GROUPS.travel,
    label: "Countries visited",
    singular: "Country visited",
    description: "Countries coloured in on the travel globe and map.",
  },
  media: {
    group: ADMIN_GROUPS.travel,
    label: "Photos",
    singular: "Photo",
    description:
      "Photos uploaded to the site. Add them to a journey from the journey's Photos field. Location data is stripped from what visitors see.",
  },

  // Diving
  diving: {
    group: ADMIN_GROUPS.diving,
    label: "Dive logs",
    singular: "Dive log",
    description: "One entry per dive, shown under /diving/logs.",
  },
  "dive-gear": {
    group: ADMIN_GROUPS.diving,
    label: "Gear",
    singular: "Gear item",
    description: "Your dive gear and its service history.",
  },
  "gear-configs": {
    group: ADMIN_GROUPS.diving,
    label: "Gear setups",
    singular: "Gear setup",
    description: "Saved sets of gear you can pick when logging a dive.",
  },

  // Food tour (friends use this; behaviour unchanged)
  "food-tour-photos": {
    group: ADMIN_GROUPS.foodTour,
    label: "Food tour photos",
    description: "Photos your friends upload on the food tour page.",
  },
  "food-tour": {
    group: ADMIN_GROUPS.foodTour,
    label: "Food tour settings",
    description:
      "Restaurants, people and the reveal date for the /food-tour page.",
  },

  // Site
  "site-access": {
    group: ADMIN_GROUPS.site,
    label: "Who can see what",
  },
  "landing-page": {
    group: ADMIN_GROUPS.site,
    label: "Home page",
  },
  "site-settings": {
    group: ADMIN_GROUPS.site,
    label: "Site settings",
    description: "Site name, passcode and other site-wide settings.",
  },
  // A collection, so the Site group sits above "Not in use yet" (globals are
  // listed after all collections in the sidebar).
  users: { group: ADMIN_GROUPS.site, label: "Your login", singular: "Login" },

  // Not in use yet (empty features, folded at the bottom)
  hobbies: { group: ADMIN_GROUPS.notInUse, description: NOT_IN_USE_NOTE },
  "hobby-references": {
    group: ADMIN_GROUPS.notInUse,
    description: NOT_IN_USE_NOTE,
  },
  "vault-records": {
    group: ADMIN_GROUPS.notInUse,
    description: NOT_IN_USE_NOTE,
  },
  "vault-files": {
    group: ADMIN_GROUPS.notInUse,
    description: NOT_IN_USE_NOTE,
  },
  "file-drops": { group: ADMIN_GROUPS.notInUse, description: NOT_IN_USE_NOTE },
  snippets: { group: ADMIN_GROUPS.notInUse, description: NOT_IN_USE_NOTE },
  "vault-settings": {
    group: ADMIN_GROUPS.notInUse,
    description: NOT_IN_USE_NOTE,
  },
  "shared-lists": {
    group: ADMIN_GROUPS.notInUse,
    description: NOT_IN_USE_NOTE,
  },
  plans: {
    group: ADMIN_GROUPS.notInUse,
    label: "Group plans",
    singular: "Group plan",
    description: NOT_IN_USE_NOTE,
  },
  "split-groups": {
    group: ADMIN_GROUPS.notInUse,
    label: "Cost splits",
    singular: "Cost split",
    description: NOT_IN_USE_NOTE,
  },
  "packing-list-templates": {
    group: ADMIN_GROUPS.notInUse,
    label: "Packing list templates",
    singular: "Packing list template",
    description: NOT_IN_USE_NOTE,
  },
  "packing-lists": {
    group: ADMIN_GROUPS.notInUse,
    label: "Packing lists",
    singular: "Packing list",
    description: NOT_IN_USE_NOTE,
  },
  "short-links": {
    group: ADMIN_GROUPS.notInUse,
    description: NOT_IN_USE_NOTE,
  },
  tech: {
    group: ADMIN_GROUPS.notInUse,
    label: "Tech posts",
    singular: "Tech post",
    description: NOT_IN_USE_NOTE,
  },
  "dive-skills": {
    group: ADMIN_GROUPS.notInUse,
    label: "Dive skills",
    singular: "Dive skill",
    description: NOT_IN_USE_NOTE,
  },
  "dive-resources": {
    group: ADMIN_GROUPS.notInUse,
    label: "Dive resources",
    singular: "Dive resource",
    description: NOT_IN_USE_NOTE,
  },

  // Behind the scenes: reachable by URL, never in the sidebar.
  "split-expenses": { group: false },
};

const ORDER = Object.keys(LAYOUT);
const NOT_IN_USE_START = ORDER.indexOf("hobbies");

function rank(slug: string): number {
  const i = ORDER.indexOf(slug);
  // Unlisted entities (new features) go after Site, before "Not in use yet".
  return i === -1 ? NOT_IN_USE_START - 0.5 : i;
}

export function isNotInUse(slug: string): boolean {
  return LAYOUT[slug]?.group === ADMIN_GROUPS.notInUse;
}

function applyCollection(c: CollectionConfig): CollectionConfig {
  const entry = LAYOUT[c.slug];
  // Already hidden collections (logs, responses) stay as they are.
  if (!entry || c.admin?.hidden === true) return c;
  const out: CollectionConfig = {
    ...c,
    admin: {
      ...c.admin,
      group: entry.group,
      ...(entry.description ? { description: entry.description } : {}),
    },
  };
  if (entry.label || entry.singular) {
    out.labels = {
      ...c.labels,
      ...(entry.singular ? { singular: entry.singular } : {}),
      ...(entry.label ? { plural: entry.label } : {}),
    };
  }
  return out;
}

function applyGlobal(g: GlobalConfig): GlobalConfig {
  const entry = LAYOUT[g.slug];
  if (!entry) return g;
  return {
    ...g,
    ...(entry.label ? { label: entry.label } : {}),
    admin: {
      ...g.admin,
      group: entry.group,
      ...(entry.description ? { description: entry.description } : {}),
    },
  };
}

/** Regroup, relabel and sort collections for the admin sidebar. */
export function layoutCollections(
  collections: CollectionConfig[],
): CollectionConfig[] {
  return collections
    .map(applyCollection)
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rank(a.c.slug) - rank(b.c.slug) || a.i - b.i)
    .map(({ c }) => c);
}

/** Regroup, relabel and sort globals for the admin sidebar. */
export function layoutGlobals(globals: GlobalConfig[]): GlobalConfig[] {
  return globals
    .map(applyGlobal)
    .map((g, i) => ({ g, i }))
    .sort((a, b) => rank(a.g.slug) - rank(b.g.slug) || a.i - b.i)
    .map(({ g }) => g);
}
