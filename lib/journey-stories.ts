import { hasPrivateAccess, type Listed, type StoryDoc } from "@/lib/journeys";

/**
 * A journey's joined stories, as this visitor may see them. The join returns
 * private stories too, so a public journey must not show a private story's
 * summary or cover to a locked-out visitor: it gets a locked teaser (title
 * and date), or nothing when the story is hidden while locked.
 * Sorted oldest first (travel order).
 */
export async function visibleJourneyStories(
  joined: unknown,
): Promise<Listed<StoryDoc>[]> {
  const docs =
    joined && typeof joined === "object"
      ? ((joined as { docs?: unknown[] }).docs ?? [])
      : [];
  const stories = docs
    .filter((doc): doc is StoryDoc => typeof doc === "object" && doc !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!stories.some((s) => s.visibility === "private")) {
    return stories.map((doc) => ({ locked: false, doc }));
  }
  const unlocked = await hasPrivateAccess();
  return stories.flatMap((doc): Listed<StoryDoc>[] => {
    if (doc.visibility !== "private" || unlocked) {
      return [{ locked: false, doc }];
    }
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
