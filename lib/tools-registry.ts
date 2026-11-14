/**
 * Tools listed on /tools. Pure data, safe to import anywhere.
 * Several features add entries here; keep descriptions plain and factual.
 */

export type ToolCategory = "engineering" | "everyday" | "hobbies" | "travel";
export interface ToolEntry {
  slug: string;
  title: string;
  description: string; // plain, factual, one line, no slogans
  category: ToolCategory;
  href: string;
  /** Section key from lib/site-sections.ts that gates it; omit when public. */
  sectionKey?: string;
}

export const TOOL_CATEGORIES: { key: ToolCategory; label: string }[] = [
  { key: "engineering", label: "Engineering" },
  { key: "everyday", label: "Everyday" },
  { key: "hobbies", label: "Hobbies" },
  { key: "travel", label: "Travel" },
];

export const TOOLS: ToolEntry[] = [
  {
    slug: "packing-lists",
    title: "Packing lists",
    description: "Clone a packing list template and share a checklist link.",
    category: "travel",
    href: "/travel/packing",
    sectionKey: "packing",
  },
  {
    slug: "food-tour-rubric",
    title: "Food tour rubric",
    description: "Score restaurants on a four-part rubric out of 20.",
    category: "everyday",
    href: "/food-tour",
    sectionKey: "foodTour",
  },
  {
    slug: "dive-log",
    title: "Dive log",
    description: "Logged dives with depth profiles, gas and conditions.",
    category: "hobbies",
    href: "/diving/logs",
    sectionKey: "diving",
  },
  {
    slug: "snippets",
    title: "Snippets",
    description: "Short code snippets and commands, with a copy button.",
    category: "engineering",
    href: "/tools/snippets",
  },
  {
    slug: "vault",
    title: "Vault",
    description: "Records, renewals, private files and file drops.",
    category: "everyday",
    href: "/vault",
    sectionKey: "vault",
  },
  {
    slug: "hobby-reference-library",
    title: "Hobby reference library",
    description:
      "Videos, guides and articles saved per hobby, grouped by topic, with a private practice log.",
    category: "hobbies",
    href: "/hobbies",
    sectionKey: "hobbies",
  },
  // Client-side developer utilities (phase-6 tools).
  {
    slug: "json",
    title: "JSON formatter",
    description:
      "Format, validate and minify JSON, with error line and column.",
    category: "engineering",
    href: "/tools/json",
  },
  {
    slug: "json-diff",
    title: "JSON diff",
    description:
      "Compare two JSON documents and list added, removed and changed values.",
    category: "engineering",
    href: "/tools/json-diff",
  },
  {
    slug: "yaml-json",
    title: "YAML ⇄ JSON",
    description: "Convert YAML to JSON and JSON to YAML.",
    category: "engineering",
    href: "/tools/yaml-json",
  },
  {
    slug: "jwt",
    title: "JWT decoder",
    description:
      "Read a JWT's header, payload and expiry. Does not verify signatures.",
    category: "engineering",
    href: "/tools/jwt",
  },
  {
    slug: "base64",
    title: "Base64",
    description:
      "Encode and decode Base64 text, including the URL-safe variant.",
    category: "engineering",
    href: "/tools/base64",
  },
  {
    slug: "url-encode",
    title: "URL encoder",
    description: "Percent-encode and decode URLs and URL components.",
    category: "engineering",
    href: "/tools/url-encode",
  },
  {
    slug: "timestamp",
    title: "Timestamp converter",
    description: "Convert Unix timestamps and dates between time zones.",
    category: "engineering",
    href: "/tools/timestamp",
  },
  {
    slug: "cron",
    title: "Cron explainer",
    description:
      "Explain a cron expression in words and list its next five runs.",
    category: "engineering",
    href: "/tools/cron",
  },
  {
    slug: "regex",
    title: "Regex tester",
    description:
      "Test a JavaScript regular expression with highlighted matches and groups.",
    category: "engineering",
    href: "/tools/regex",
  },
  {
    slug: "uuid",
    title: "UUID and nanoid generator",
    description: "Generate UUID v4, UUID v7 and nanoid IDs.",
    category: "engineering",
    href: "/tools/uuid",
  },
  {
    slug: "hash",
    title: "Hash generator",
    description:
      "SHA-1, SHA-256, SHA-384 and SHA-512 digests of text or a file.",
    category: "engineering",
    href: "/tools/hash",
  },
  // Family tools (phase-8).
  {
    slug: "one-time-secret",
    title: "One-time secret",
    description:
      "Send a note through a link that opens once; it's encrypted in the browser.",
    category: "everyday",
    href: "/tools/secret",
  },
  {
    slug: "shared-lists",
    title: "Shared lists",
    description: "Checklists that anyone with the link can tick and add to.",
    category: "everyday",
    href: "/lists",
    sectionKey: "lists",
  },
  {
    slug: "call-times",
    title: "Call times",
    description:
      "Local times for family and friends, and the hours when everyone is awake.",
    category: "everyday",
    href: "/tools/call-times",
    sectionKey: "callTimes",
  },
];

export function isToolCategory(value: unknown): value is ToolCategory {
  return TOOL_CATEGORIES.some((c) => c.key === value);
}
