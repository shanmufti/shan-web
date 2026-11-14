/**
 * Option lists shared by the hobby collections and the /hobbies pages.
 * Pure data, safe to import anywhere.
 */

interface Option<V extends string> {
  value: V;
  label: string;
}

export const REFERENCE_KINDS = [
  { value: "video", label: "Video" },
  { value: "guide", label: "Guide" },
  { value: "article", label: "Article" },
  { value: "course", label: "Course" },
  { value: "other", label: "Other" },
] as const satisfies readonly Option<string>[];
export type ReferenceKind = (typeof REFERENCE_KINDS)[number]["value"];

export const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const satisfies readonly Option<string>[];
export type SkillLevel = (typeof SKILL_LEVELS)[number]["value"];

export const REFERENCE_STATUSES = [
  { value: "to-watch", label: "To watch" },
  { value: "watched", label: "Watched" },
  { value: "favourite", label: "Favourite" },
] as const satisfies readonly Option<string>[];
export type ReferenceStatus = (typeof REFERENCE_STATUSES)[number]["value"];

/**
 * Lucide icons offered for a hobby. A fixed list (rather than any Lucide
 * name) keeps the page bundle to these icons only.
 */
export const HOBBY_ICONS = [
  { value: "mountain", label: "Mountain" },
  { value: "mountain-snow", label: "Snowy mountain" },
  { value: "waves", label: "Waves" },
  { value: "anchor", label: "Anchor" },
  { value: "fish", label: "Fish" },
  { value: "sailboat", label: "Sailboat" },
  { value: "wind", label: "Wind" },
  { value: "snowflake", label: "Snowflake" },
  { value: "bike", label: "Bike" },
  { value: "footprints", label: "Footprints" },
  { value: "person-standing", label: "Person standing" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "volleyball", label: "Ball" },
  { value: "tent", label: "Tent" },
  { value: "compass", label: "Compass" },
  { value: "camera", label: "Camera" },
  { value: "music", label: "Music" },
  { value: "guitar", label: "Guitar" },
  { value: "palette", label: "Palette" },
  { value: "chef-hat", label: "Chef hat" },
  { value: "book-open", label: "Book" },
  { value: "code", label: "Code" },
  { value: "gamepad-2", label: "Gamepad" },
  { value: "sprout", label: "Sprout" },
  { value: "sparkles", label: "Sparkles" },
] as const satisfies readonly Option<string>[];
export type HobbyIconName = (typeof HOBBY_ICONS)[number]["value"];

export function labelFor(
  options: readonly Option<string>[],
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? value;
}

export function isOptionValue<V extends string>(
  options: readonly Option<V>[],
  value: unknown,
): value is V {
  return typeof value === "string" && options.some((o) => o.value === value);
}

/** Placeholder shown until Shan writes a hobby's description. */
export const HOBBY_DESCRIPTION_PLACEHOLDER = "[Description: Shan to write]";

export function hobbyDescription(value: string | null | undefined): string {
  const text = value?.trim();
  if (text) return text;
  return HOBBY_DESCRIPTION_PLACEHOLDER;
}
