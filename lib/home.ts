import config from "@payload-config";
import { cacheLife, cacheTag } from "next/cache";
import { getPayload, type Where } from "payload";

import { CONTENT_CACHE_LIFE } from "@/lib/cache-tags";
import { getSectionModes, toolsFor } from "@/lib/site-access";
import { canView, type Viewer } from "@/lib/site-access-rules";
import {
  SITE_SECTIONS,
  type AccessMode,
  type SectionKey,
  type SectionModes,
  type SiteSection,
} from "@/lib/site-sections";
import type { ToolEntry } from "@/lib/tools-registry";
import type { LandingPage } from "@/payload-types";

/**
 * Data for the home page bento hub (app/(site)/page.tsx).
 *
 * Two paths, one shape:
 * - `publicHomeData()` is cacheable ("use cache", see below) and holds only what an
 *   anonymous visitor may see: published, public posts and public hobbies.
 * - `viewerHomeData()` runs per request for the owner or a passcode holder
 *   and adds private posts (and, for the owner, private hobbies).
 * Section modes are applied afterwards by `buildHomeView()`, so a hidden
 * section's tiles drop out for everyone who can't open it.
 */

/** Same lifetime as other CMS reads; Payload hooks expire the tags on edit. */
export const HOME_CACHE_LIFE = CONTENT_CACHE_LIFE;

/** Tags each cached reader depends on (`collection:<slug>`, `global:<slug>`). */
export const HOME_CACHE_TAGS = {
  data: [
    "collection:tech",
    "collection:travel",
    "collection:diving",
    "collection:hobbies",
    "collection:hobby-references",
  ],
  landing: ["global:landing-page"],
  modes: ["global:site-access"],
} as const;

export type HomeItemKind = "tech" | "journey" | "dive";

export interface HomeItem {
  kind: HomeItemKind;
  id: number;
  title: string;
  href: string;
  /** ISO date used for ordering and display. */
  date: string;
  summary: string | null;
  /** Passcode-only post (shown to the owner and passcode holders). */
  isPrivate: boolean;
}

export interface HomeHobby {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  referenceCount: number;
  isPrivate: boolean;
}

export interface HomeData {
  hobbies: HomeHobby[];
  latest: Record<HomeItemKind, HomeItem[]>;
  counts: { journeys: number; tech: number };
}

/** Which section gates each kind of post. */
export const ITEM_SECTION: Record<HomeItemKind, SectionKey> = {
  tech: "tech",
  journey: "journeys",
  dive: "diving",
};

export const ITEM_LABEL: Record<HomeItemKind, string> = {
  tech: "Tech note",
  journey: "Journey",
  dive: "Dive",
};

const LATEST_PER_KIND = 4;

const published: Where = { draft: { equals: false } };
const publishedPublic: Where = {
  and: [
    published,
    {
      or: [
        { visibility: { equals: "public" } },
        { visibility: { exists: false } },
      ],
    },
  ],
};

interface PostRow {
  id: number;
  title: string;
  slug: string;
  date: string;
  startDate?: string;
  summary?: string | null;
  visibility?: string | null;
  hideWhenLocked?: boolean | null;
}

function toItem(kind: HomeItemKind, row: PostRow, base: string): HomeItem {
  return {
    kind,
    id: row.id,
    title: row.title,
    href: `${base}/${row.slug}`,
    date: row.startDate ?? row.date,
    summary: row.summary?.trim() ? row.summary : null,
    isPrivate: row.visibility === "private",
  };
}

/**
 * Reads with overrideAccess and explicit filters (Local API calls don't
 * carry the passcode cookie, so collection access can't tell passcode
 * holders apart). Drafts never leave the server.
 */
async function loadHomeData(options: {
  privatePosts: boolean;
  privateHobbies: boolean;
}): Promise<HomeData> {
  const payload = await getPayload({ config });
  const postWhere = options.privatePosts ? published : publishedPublic;
  const hobbyWhere: Where = options.privateHobbies
    ? {}
    : { public: { equals: true } };
  const refWhere: Where = options.privateHobbies
    ? {}
    : {
        and: [
          { public: { equals: true } },
          { "hobby.public": { equals: true } },
        ],
      };
  const postSelect = {
    title: true,
    slug: true,
    date: true,
    summary: true,
    visibility: true,
  } as const;

  const [tech, journeys, dives, hobbies, refs] = await Promise.all([
    payload.find({
      collection: "tech",
      where: published,
      sort: "-date",
      limit: LATEST_PER_KIND,
      depth: 0,
      select: { title: true, slug: true, date: true, summary: true },
      overrideAccess: true,
    }),
    payload.find({
      collection: "travel",
      where: postWhere,
      sort: "-startDate",
      limit: LATEST_PER_KIND,
      depth: 0,
      select: { ...postSelect, startDate: true },
      overrideAccess: true,
    }),
    payload.find({
      collection: "diving",
      where: published,
      sort: "-date",
      limit: LATEST_PER_KIND,
      depth: 0,
      select: { title: true, slug: true, date: true, summary: true },
      overrideAccess: true,
    }),
    payload.find({
      collection: "hobbies",
      where: hobbyWhere,
      sort: ["order", "name"],
      depth: 0,
      pagination: false,
      select: {
        name: true,
        slug: true,
        icon: true,
        description: true,
        public: true,
      },
      overrideAccess: true,
    }),
    payload.find({
      collection: "hobby-references",
      where: refWhere,
      depth: 0,
      pagination: false,
      select: { hobby: true },
      overrideAccess: true,
    }),
  ]);

  const refCounts = new Map<number, number>();
  for (const ref of refs.docs) {
    const id = typeof ref.hobby === "number" ? ref.hobby : ref.hobby.id;
    refCounts.set(id, (refCounts.get(id) ?? 0) + 1);
  }

  return {
    hobbies: hobbies.docs.map((h) => ({
      id: h.id,
      name: h.name,
      slug: h.slug,
      icon: h.icon,
      description: h.description?.trim() ? h.description : null,
      referenceCount: refCounts.get(h.id) ?? 0,
      isPrivate: h.public === false,
    })),
    latest: {
      tech: tech.docs.map((d) => toItem("tech", d as PostRow, "/tech")),
      journey: journeys.docs.map((d) =>
        toItem("journey", d as PostRow, "/travel"),
      ),
      dive: dives.docs.map((d) => toItem("dive", d as PostRow, "/diving/logs")),
    },
    counts: {
      journeys: journeys.totalDocs,
      tech: tech.totalDocs,
    },
  };
}

/** What anyone may see. Same for every visitor, so cached. */
export async function publicHomeData(): Promise<HomeData> {
  "use cache";
  cacheLife(HOME_CACHE_LIFE);
  cacheTag(...HOME_CACHE_TAGS.data);
  return loadHomeData({ privatePosts: false, privateHobbies: false });
}

/**
 * Per request, never cached: private posts for the owner and passcode
 * holders, private hobbies for the owner only.
 */
export async function viewerHomeData(viewer: Viewer): Promise<HomeData> {
  if (viewer === "anonymous") return publicHomeData();
  return loadHomeData({
    privatePosts: true,
    privateHobbies: viewer === "owner",
  });
}

/** The landing-page global (hero, Now tile, links). Cached. */
export async function landingContent(): Promise<LandingPage> {
  "use cache";
  cacheLife(HOME_CACHE_LIFE);
  cacheTag(...HOME_CACHE_TAGS.landing);
  const payload = await getPayload({ config });
  return payload.findGlobal({ slug: "landing-page", depth: 0 });
}

/** Section modes (cached in lib/site-access.ts, site-access tag). */
export async function homeSectionModes(): Promise<SectionModes> {
  return getSectionModes();
}

// ---------------------------------------------------------------------------
// View model: data + section modes + viewer → what the page renders.

export interface HomeStat {
  label: string;
  value: number;
  href: string;
}

export interface HomeView {
  viewer: Viewer;
  sections: SiteSection[];
  tools: ToolEntry[];
  /** The /tools page itself is open to this viewer. */
  toolsHubOpen: boolean;
  /** null when the Hobbies section is closed to this viewer. */
  hobbies: HomeHobby[] | null;
  /** Newest first, across every open section. */
  latest: HomeItem[];
  stats: HomeStat[];
}

function modeOf(modes: SectionModes, key: string): AccessMode {
  // Unknown key: owner only, rather than leaking a link.
  return (modes as Record<string, AccessMode | undefined>)[key] ?? "owner";
}

export function buildHomeView(
  data: HomeData,
  modes: SectionModes,
  viewer: Viewer,
): HomeView {
  const open = (key: string) => canView(modeOf(modes, key), viewer);
  const sections = SITE_SECTIONS.filter((s) => open(s.key));

  const latest = (Object.keys(data.latest) as HomeItemKind[])
    .filter((kind) => open(ITEM_SECTION[kind]))
    .flatMap((kind) => data.latest[kind])
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, LATEST_PER_KIND);

  const hobbies = open("hobbies") ? data.hobbies : null;
  const references =
    hobbies?.reduce((sum, h) => sum + h.referenceCount, 0) ?? 0;

  const stats: HomeStat[] = [];
  if (hobbies && hobbies.length > 0) {
    stats.push({ label: "Hobbies", value: hobbies.length, href: "/hobbies" });
  }
  if (references > 0) {
    stats.push({ label: "References", value: references, href: "/hobbies" });
  }
  if (open("journeys") && data.counts.journeys > 0) {
    stats.push({
      label: "Journeys",
      value: data.counts.journeys,
      href: "/travel",
    });
  }
  if (open("tech") && data.counts.tech > 0) {
    stats.push({ label: "Tech notes", value: data.counts.tech, href: "/tech" });
  }

  return {
    viewer,
    sections,
    tools: toolsFor(modes, viewer),
    toolsHubOpen: open("tools"),
    hobbies,
    latest,
    stats,
  };
}
