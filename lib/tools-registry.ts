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
    slug: "places",
    title: "Places",
    description:
      "Destination pages with saved Google Maps places on a map, grouped by category.",
    category: "travel",
    href: "/travel/places",
    sectionKey: "places",
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
];

export function isToolCategory(value: unknown): value is ToolCategory {
  return TOOL_CATEGORIES.some((c) => c.key === value);
}
