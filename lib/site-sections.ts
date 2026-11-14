/**
 * Site sections whose access is managed in /admin → Settings → Access.
 * Pure data, safe to import anywhere (proxy, server components, Payload config).
 */

export const ACCESS_MODES = ["public", "passcode", "owner"] as const;
export type AccessMode = (typeof ACCESS_MODES)[number];

export const ACCESS_MODE_LABELS: Record<AccessMode, string> = {
  public: "Public: anyone",
  passcode: "Passcode: visitors who enter the private passcode",
  owner: "Hidden: only you, logged in",
};

export interface SiteSection {
  key: string;
  label: string;
  /** Main page, used for nav, the landing page and the sitemap. */
  href: string;
  /** Short line shown on the landing page. */
  blurb: string;
  /** Path prefixes this section owns. Longest match wins. */
  paths: readonly string[];
  /** Payload REST collections that belong to this section. */
  collections: readonly string[];
  /** Mode used until it's saved in /admin. */
  defaultMode: AccessMode;
  /** Show in the header and footer nav when visible. */
  inNav: boolean;
  /** List on the landing page when visible. */
  onLanding: boolean;
  /**
   * Paths inside this section that the proxy lets through because the route
   * checks its own secret token (for clients with no cookie, such as a phone
   * calendar, or share links). Exact paths, or a prefix ending in `/*` for
   * every path below it. The route must 404 on a wrong token.
   */
  tokenPaths?: readonly string[];
  /** Always Hidden (owner only), whatever is saved in /admin. */
  ownerOnly?: boolean;
}

export const SITE_SECTIONS = [
  {
    key: "journeys",
    label: "Journeys",
    href: "/travel",
    blurb: "Trips, routes and the places along the way.",
    paths: ["/travel"],
    collections: ["travel", "visited-countries"],
    defaultMode: "owner",
    inNav: true,
    onLanding: true,
  },
  {
    key: "packing",
    label: "Packing lists",
    href: "/travel/packing",
    blurb: "Packing list templates and shared lists.",
    paths: ["/travel/packing"],
    collections: ["packing-list-templates", "packing-lists"],
    defaultMode: "owner",
    inNav: false,
    onLanding: false,
  },
  {
    key: "stories",
    label: "Stories",
    href: "/blog",
    blurb: "Longer writing from the road.",
    paths: ["/blog"],
    collections: ["blog"],
    defaultMode: "owner",
    inNav: true,
    onLanding: true,
  },
  {
    key: "diving",
    label: "Diving",
    href: "/diving",
    blurb: "Dive logs, gear, skills and resources.",
    paths: ["/diving"],
    collections: [
      "diving",
      "dive-gear",
      "gear-configs",
      "dive-skills",
      "dive-resources",
    ],
    defaultMode: "owner",
    inNav: true,
    onLanding: true,
  },
  {
    key: "tech",
    label: "Tech",
    href: "/tech",
    blurb: "Notes on software and tools.",
    paths: ["/tech"],
    collections: ["tech"],
    defaultMode: "owner",
    inNav: true,
    onLanding: true,
  },
  {
    key: "hobbies",
    label: "Hobbies",
    href: "/hobbies",
    blurb: "Reference links and practice notes, by hobby.",
    paths: ["/hobbies"],
    collections: ["hobbies", "hobby-references", "practice-sessions"],
    defaultMode: "public",
    inNav: true,
    onLanding: true,
  },
  {
    key: "foodTour",
    label: "Food tour",
    href: "/food-tour",
    blurb: "Score each stop on the food tour rubric.",
    paths: ["/food-tour"],
    collections: ["food-tour-photos"],
    defaultMode: "public",
    inNav: false,
    onLanding: true,
  },
  {
    key: "tools",
    label: "Tools",
    href: "/tools",
    blurb: "Small tools and reference pages.",
    paths: ["/tools"],
    collections: [],
    defaultMode: "public",
    inNav: true,
    onLanding: true,
  },
  {
    key: "callTimes",
    label: "Call times",
    href: "/tools/call-times",
    blurb: "Local times and overlapping waking hours.",
    paths: ["/tools/call-times"],
    collections: ["call-planner"],
    defaultMode: "passcode",
    inNav: false,
    onLanding: false,
  },
  {
    key: "lists",
    label: "Shared lists",
    href: "/lists",
    blurb: "Checklists shared by link.",
    paths: ["/lists"],
    // The list index is yours; each /lists/<share link> page checks its own
    // unguessable slug, so anyone with a link can open that one list.
    collections: ["shared-lists"],
    defaultMode: "owner",
    inNav: false,
    onLanding: false,
    tokenPaths: ["/lists/*"],
    ownerOnly: true,
  },
  {
    key: "vault",
    label: "Vault",
    href: "/vault",
    blurb: "Private records, files and renewals.",
    paths: ["/vault"],
    // REST paths (collections and globals) that only the owner can call.
    collections: [
      "vault-records",
      "vault-files",
      "file-drops",
      "snippets",
      "vault-settings",
    ],
    defaultMode: "owner",
    inNav: false,
    onLanding: false,
    tokenPaths: ["/vault/calendar.ics"],
    ownerOnly: true,
  },
] as const satisfies readonly SiteSection[];

export type SectionKey = (typeof SITE_SECTIONS)[number]["key"];
export type SectionModes = Record<SectionKey, AccessMode>;

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Section that owns a page path, by longest matching prefix. */
export function sectionForPath(pathname: string): SiteSection | null {
  let best: SiteSection | null = null;
  let bestLength = -1;
  for (const section of SITE_SECTIONS) {
    for (const prefix of section.paths) {
      if (matchesPrefix(pathname, prefix) && prefix.length > bestLength) {
        best = section;
        bestLength = prefix.length;
      }
    }
  }
  return best;
}

/** True for a path the section's own route guards with a token. */
export function isTokenPath(section: SiteSection, pathname: string): boolean {
  return (
    section.tokenPaths?.some((path) => {
      if (!path.endsWith("/*")) return path === pathname;
      const base = path.slice(0, -1);
      return pathname.startsWith(base) && pathname.length > base.length;
    }) ?? false
  );
}

/**
 * Section that owns a Payload REST path like /api/blog, /api/blog/12 or
 * /api/globals/vault-settings.
 */
export function sectionForApiPath(pathname: string): SiteSection | null {
  const parts = pathname.split("/");
  const slug = parts[2] === "globals" ? parts[3] : parts[2];
  if (!slug) return null;
  return (
    SITE_SECTIONS.find((s) =>
      (s.collections as readonly string[]).includes(slug),
    ) ?? null
  );
}

export function isAccessMode(value: unknown): value is AccessMode {
  return (
    typeof value === "string" &&
    (ACCESS_MODES as readonly string[]).includes(value)
  );
}

/** Saved modes, falling back to each section's default. */
export function resolveModes(saved: unknown): SectionModes {
  const record =
    saved && typeof saved === "object"
      ? (saved as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    SITE_SECTIONS.map((s: SiteSection) => {
      if (s.ownerOnly) return [s.key, "owner"];
      const value = record[s.key];
      return [s.key, isAccessMode(value) ? value : s.defaultMode];
    }),
  ) as SectionModes;
}
