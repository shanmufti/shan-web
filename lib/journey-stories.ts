import { isPrivate, type Listed, type StoryDoc } from "@/lib/journeys";
import { hasPrivateAccess } from "@/lib/site-access";

function joinedStories(joined: unknown): StoryDoc[] {
  const docs =
    joined && typeof joined === "object"
      ? ((joined as { docs?: unknown[] }).docs ?? [])
      : [];
  return docs
    .filter((doc): doc is StoryDoc => typeof doc === "object" && doc !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Whether a journey's joined stories include a private one. */
export function hasPrivateJoinedStory(joined: unknown): boolean {
  return joinedStories(joined).some(isPrivate);
}

/**
 * A journey's joined stories, as a visitor with (`unlocked`) or without
 * private access may see them. The join returns private stories too, so a
 * public journey must not show a private story's summary or cover to a
 * locked-out visitor: it gets a locked teaser (title and date), or nothing
 * when the story is hidden while locked. Sorted oldest first (travel order).
 */
export function journeyStoriesFor(
  joined: unknown,
  unlocked: boolean,
): Listed<StoryDoc>[] {
  return joinedStories(joined).flatMap((doc): Listed<StoryDoc>[] => {
    if (!isPrivate(doc) || unlocked) return [{ locked: false, doc }];
    if (doc.hideWhenLocked) return [];
    return [
      {
        locked: true,
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        date: doc.date,
      },
    ];
  });
}

/**
 * {@link journeyStoriesFor} for the current visitor. Reads the passcode
 * cookie (request time) only when a joined story is private.
 */
export async function visibleJourneyStories(
  joined: unknown,
): Promise<Listed<StoryDoc>[]> {
  const unlocked = hasPrivateJoinedStory(joined)
    ? await hasPrivateAccess()
    : false;
  return journeyStoriesFor(joined, unlocked);
}
