import { listPublished } from "@/lib/content";
import { isPrivate, journeyDocs, storyDocs } from "@/lib/journeys";
import {
  currentViewer,
  visibleSections,
  visibleTools,
} from "@/lib/site-access";
import type { Viewer } from "@/lib/site-access-rules";
import type { SectionKey, SiteSection } from "@/lib/site-sections";

export type SearchGroup =
  "Pages" | "Journeys" | "Stories" | "Dives" | "Tech notes" | "Tools";

export interface SearchItem {
  group: SearchGroup;
  title: string;
  href: string;
  /** Short secondary text: a year or the parent section. */
  hint?: string;
}

/** Sub-pages listed under a section when that section is open. */
const SUB_PAGES: Partial<
  Record<SectionKey, { title: string; href: string; ownerOnly?: boolean }[]>
> = {
  journeys: [{ title: "Journeys map", href: "/travel/map" }],
  diving: [
    { title: "Dive logs", href: "/diving/logs" },
    { title: "Dive skills", href: "/diving/skills" },
    { title: "Dive resources", href: "/diving/resources" },
    { title: "Dive gear", href: "/diving/gear", ownerOnly: true },
  ],
};

function contentItem(
  group: SearchGroup,
  title: string,
  href: string,
  date: string | null | undefined,
): SearchItem {
  const d = date ? new Date(date) : null;
  return d && !Number.isNaN(d.getTime())
    ? { group, title, href, hint: String(d.getUTCFullYear()) }
    : { group, title, href };
}

function pageItems(sections: SiteSection[], viewer: Viewer): SearchItem[] {
  const items: SearchItem[] = [{ group: "Pages", title: "Home", href: "/" }];
  for (const section of sections) {
    items.push({ group: "Pages", title: section.label, href: section.href });
    const subs = (SUB_PAGES[section.key as SectionKey] ?? []).filter(
      (sub) => !sub.ownerOnly || viewer === "owner",
    );
    for (const sub of subs) {
      items.push({
        group: "Pages",
        title: sub.title,
        href: sub.href,
        hint: section.label,
      });
    }
  }
  if (viewer === "anonymous") {
    items.push({ group: "Pages", title: "Enter passcode", href: "/unlock" });
  }
  return items;
}

/**
 * Everything the command palette can jump to, for THIS visitor only:
 * sections they can open (lib/site-sections.ts modes) and the published
 * content inside them. Private journeys and stories appear only with the
 * passcode or for the owner; locked teasers are left out because the
 * visitor can't open them. Drafts never appear.
 */
export async function buildSearchIndex(): Promise<SearchItem[]> {
  const [sections, viewer, tools] = await Promise.all([
    visibleSections(),
    currentViewer(),
    visibleTools(),
  ]);
  const open = new Set<string>(sections.map((s) => s.key));
  const unlocked = viewer !== "anonymous";
  // Same rules as lib/journeys.ts listings. The readers are cached and
  // include private docs, so filter here, per visitor.
  const showDoc = (doc: { visibility?: string | null }) =>
    unlocked || !isPrivate(doc);

  const [journeys, stories, dives, tech] = await Promise.all([
    open.has("journeys") ? journeyDocs() : [],
    open.has("stories") ? storyDocs() : [],
    open.has("diving") ? listPublished("diving", { limit: 500 }) : [],
    open.has("tech") ? listPublished("tech", { limit: 200 }) : [],
  ]);

  const pages = pageItems(sections, viewer);
  const pageHrefs = new Set(pages.map((item) => item.href));

  return [
    ...pages,
    ...journeys
      .filter(showDoc)
      .map((doc) =>
        contentItem(
          "Journeys",
          doc.title,
          `/travel/${doc.slug}`,
          doc.startDate,
        ),
      ),
    ...stories
      .filter(showDoc)
      .map((doc) =>
        contentItem("Stories", doc.title, `/blog/${doc.slug}`, doc.date),
      ),
    ...dives.map((doc) =>
      contentItem("Dives", doc.title, `/diving/logs/${doc.slug}`, doc.date),
    ),
    ...tech.map((doc) =>
      contentItem("Tech notes", doc.title, `/tech/${doc.slug}`, doc.date),
    ),
    // Tools from lib/tools-registry.ts, skipping ones already listed as pages.
    ...tools
      .filter((tool) => !pageHrefs.has(tool.href))
      .map((tool) => ({
        group: "Tools" as const,
        title: tool.title,
        href: tool.href,
        hint: "Tools",
      })),
  ];
}
