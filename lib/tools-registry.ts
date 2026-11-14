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
    slug: "hobby-reference-library",
    title: "Hobby reference library",
    description:
      "Videos, guides and articles saved per hobby, grouped by topic, with a private practice log.",
    category: "hobbies",
    href: "/hobbies",
    sectionKey: "hobbies",
  },
];
