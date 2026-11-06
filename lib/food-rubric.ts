/**
 * The food tour evaluation rubric. Shared by the form (client), the server
 * action (validation) and the results page, so the wording lives in one place.
 */

export const RUBRIC_LEVELS = [
  { points: 5, label: "Outstanding" },
  { points: 4, label: "Good" },
  { points: 3, label: "Average" },
  { points: 1, label: "Poor" },
] as const;

export type RubricPoints = (typeof RUBRIC_LEVELS)[number]["points"];

export const RUBRIC_CATEGORIES = [
  {
    key: "food",
    label: "Food quality",
    descriptions: {
      5: "Exceptional flavor, fresh, perfectly prepared",
      4: "Tastes great, well-cooked, enjoyable",
      3: "Decent taste, nothing special, slightly inconsistent",
      1: "Blah, overcooked, or cold; unsatisfactory",
    },
  },
  {
    key: "ambiance",
    label: "Ambiance & vibe",
    descriptions: {
      5: "Immersive, comfortable, great decor & music",
      4: "Clean, pleasant, consistent with theme",
      3: "Acceptable, slightly noisy, average setting",
      1: "Uncomfortable, dirty, or distracting environment",
    },
  },
  {
    key: "price",
    label: "Price value",
    descriptions: {
      5: "Unbelievable value, feels like a steal",
      4: "Reasonable price for the quality",
      3: "Standard market pricing, acceptable",
      1: "Overpriced, feels like poor value",
    },
  },
  {
    key: "again",
    label: "Would you go again?",
    descriptions: {
      5: "Absolutely! Can't wait for my next visit",
      4: "Yes, would definitely recommend",
      3: "Maybe, depends on other options",
      1: "Definitely not, cross it off the list",
    },
  },
] as const satisfies readonly {
  key: string;
  label: string;
  descriptions: Record<RubricPoints, string>;
}[];

export type RubricCategoryKey = (typeof RUBRIC_CATEGORIES)[number]["key"];

export const RUBRIC_MAX_TOTAL = 5 * RUBRIC_CATEGORIES.length;

export function isRubricPoints(value: number): value is RubricPoints {
  return RUBRIC_LEVELS.some((level) => level.points === value);
}
