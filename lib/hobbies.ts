import config from "@payload-config";
import { getPayload } from "payload";

import { getCurrentUser } from "@/lib/content";
import type {
  Hobby,
  HobbyReference,
  Media,
  PracticeSession,
} from "@/payload-types";

/**
 * Hobby reads for the /hobbies pages. Every query runs with
 * `overrideAccess: false` and the visitor's own user (or none), so the
 * collection access rules decide what is visible: anonymous visitors only
 * ever get public hobbies and public references of public hobbies, and
 * practice sessions only come back for the logged-in owner.
 */

export type { Hobby, HobbyReference, PracticeSession };

export interface HobbyCard extends Hobby {
  referenceCount: number;
  coverImage: { url: string; alt: string } | null;
}

function coverOf(hobby: Hobby): HobbyCard["coverImage"] {
  const cover: Media | number | null | undefined = hobby.cover;
  if (!cover || typeof cover === "number" || !cover.url) return null;
  return { url: cover.url, alt: cover.alt ?? "" };
}

export async function listHobbies(): Promise<{
  hobbies: HobbyCard[];
  isOwner: boolean;
}> {
  const [payload, user] = await Promise.all([
    getPayload({ config }),
    getCurrentUser(),
  ]);
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

  return {
    isOwner: Boolean(user),
    hobbies: hobbies.map((hobby) => ({
      ...hobby,
      referenceCount: counts.get(hobby.id) ?? 0,
      coverImage: coverOf(hobby),
    })),
  };
}

export interface HobbyPageData {
  hobby: Hobby;
  references: HobbyReference[];
  /** Only for the owner; null for everyone else. */
  sessions: PracticeSession[] | null;
  isOwner: boolean;
}

export async function getHobbyPage(
  slug: string,
): Promise<HobbyPageData | null> {
  const [payload, user] = await Promise.all([
    getPayload({ config }),
    getCurrentUser(),
  ]);
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

  const [{ docs: references }, sessions] = await Promise.all([
    payload.find({
      collection: "hobby-references",
      where: { hobby: { equals: hobby.id } },
      sort: ["topic", "-createdAt"],
      depth: 0,
      pagination: false,
      user,
      overrideAccess: false,
    }),
    user
      ? payload
          .find({
            collection: "practice-sessions",
            where: { hobby: { equals: hobby.id } },
            sort: "-date",
            depth: 0,
            limit: 500,
            user,
            overrideAccess: false,
          })
          .then((r) => r.docs)
      : Promise.resolve(null),
  ]);

  return { hobby, references, sessions, isOwner: Boolean(user) };
}

/** Public hobby slugs, for the sitemap. */
export async function listPublicHobbySlugs() {
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
