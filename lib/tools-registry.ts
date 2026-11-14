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
export const TOOLS: ToolEntry[] = [
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
];
