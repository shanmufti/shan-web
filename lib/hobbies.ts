import config from "@payload-config";
import { cacheLife, cacheTag } from "next/cache";
import { getPayload } from "payload";

import { collectionTag, CONTENT_CACHE_LIFE } from "@/lib/cache-tags";
import { getCurrentUser } from "@/lib/content";
import type { Hobby, HobbyReference, Media } from "@/payload-types";

/**
 * Hobby reads for the /hobbies pages. Every query runs with
 * `overrideAccess: false` and the visitor's own user (or none), so the
 * collection access rules decide what is visible: anonymous visitors only
 * ever get public hobbies and public references of public hobbies.
 *
 * Caching: what an anonymous visitor sees is cached ("use cache", tagged by
 * collection, expired by the Payload hooks in lib/revalidate.ts). The
 * owner's view (private hobbies) is always read per
 * request and never enters a cache.
 */

type Payload = Awaited<ReturnType<typeof getPayload>>;
type User = Awaited<ReturnType<typeof getCurrentUser>>;

function tagHobbies() {
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(
    collectionTag("hobbies"),
    collectionTag("hobby-references"),
    collectionTag("media"),
  );
}

export type { Hobby, HobbyReference };

export interface HobbyCard extends Hobby {
  referenceCount: number;
  coverImage: { url: string; alt: string } | null;
}

function coverOf(hobby: Hobby): HobbyCard["coverImage"] {
  const cover: Media | number | null | undefined = hobby.cover;
  if (!cover || typeof cover === "number" || !cover.url) return null;
  return { url: cover.url, alt: cover.alt ?? "" };
}

async function loadHobbyCards(
  payload: Payload,
  user: User,
): Promise<HobbyCard[]> {
  const [{ docs: hobbies }, { docs: refs }] = await Promise.all([
    payload.find({
      collection: "hobbies",
      sort: ["order", "name"],
      depth: 1,
      pagination: false,
      user,
      overrideAccess: false,
    }),
    payload.find({
      collection: "hobby-references",
      select: { hobby: true },
      depth: 0,
      pagination: false,
      user,
      overrideAccess: false,
    }),
  ]);

  const counts = new Map<number, number>();
  for (const ref of refs) {
    const id = typeof ref.hobby === "number" ? ref.hobby : ref.hobby.id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return hobbies.map((hobby) => ({
    ...hobby,
    referenceCount: counts.get(hobby.id) ?? 0,
    coverImage: coverOf(hobby),
  }));
}

/** Hobby cards as an anonymous visitor sees them. Cached. */
export async function publicHobbyCards(): Promise<HobbyCard[]> {
  "use cache";
  tagHobbies();
  return loadHobbyCards(await getPayload({ config }), null);
}

/**
 * Hobby cards for this visitor. Reads the session, so call it inside a
 * <Suspense> boundary or a per-request route.
 */
export async function listHobbies(): Promise<{
  hobbies: HobbyCard[];
  isOwner: boolean;
}> {
  const user = await getCurrentUser();
  if (!user) return { hobbies: await publicHobbyCards(), isOwner: false };
  return {
    hobbies: await loadHobbyCards(await getPayload({ config }), user),
    isOwner: true,
  };
}

export interface HobbyPageData {
  hobby: Hobby;
  references: HobbyReference[];
  isOwner: boolean;
}

async function loadHobbyPage(
  payload: Payload,
  user: User,
  slug: string,
): Promise<HobbyPageData | null> {
  const { docs } = await payload.find({
    collection: "hobbies",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    user,
    overrideAccess: false,
  });
  const hobby = docs[0];
  if (!hobby) return null;

  const { docs: references } = await payload.find({
    collection: "hobby-references",
    where: { hobby: { equals: hobby.id } },
    sort: ["topic", "-createdAt"],
    depth: 0,
    pagination: false,
    user,
    overrideAccess: false,
  });

  return { hobby, references, isOwner: Boolean(user) };
}

/** A hobby page as an anonymous visitor sees it. Cached. */
export async function publicHobbyPage(
  slug: string,
): Promise<HobbyPageData | null> {
  "use cache";
  tagHobbies();
  return loadHobbyPage(await getPayload({ config }), null, slug);
}

/**
 * A hobby page for this visitor. Reads the session, so call it inside a
 * <Suspense> boundary or a per-request route.
 */
export async function getHobbyPage(
  slug: string,
): Promise<HobbyPageData | null> {
  const user = await getCurrentUser();
  if (!user) return publicHobbyPage(slug);
  return loadHobbyPage(await getPayload({ config }), user, slug);
}

/** Public hobby slugs, for the sitemap. */
export async function listPublicHobbySlugs() {
  "use cache";
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(collectionTag("hobbies"));
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "hobbies",
    select: { slug: true, updatedAt: true },
    depth: 0,
    pagination: false,
    overrideAccess: false,
  });
  return docs;
}
