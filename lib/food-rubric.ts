/**
 * The food tour evaluation rubric. Shared by the form (client), the server
 * action (validation) and the results page, so the wording lives in one place.
 */

/** Each category is scored 1–10. The bands give the wording for each range. */
export const RUBRIC_MAX_POINTS = 10;

export const RUBRIC_BANDS = [
  { key: "outstanding", label: "Outstanding", min: 9, max: 10 },
  { key: "good", label: "Good", min: 7, max: 8 },
  { key: "average", label: "Average", min: 4, max: 6 },
  { key: "poor", label: "Poor", min: 1, max: 3 },
] as const;

export type RubricBandKey = (typeof RUBRIC_BANDS)[number]["key"];

export const RUBRIC_POINTS: readonly number[] = Array.from(
  { length: RUBRIC_MAX_POINTS },
  (_, i) => i + 1,
);

export function bandFor(points: number) {
  return RUBRIC_BANDS.find((b) => points >= b.min && points <= b.max);
}

export const RUBRIC_CATEGORIES = [
  {
    key: "food",
    label: "Food quality",
    descriptions: {
      outstanding: "Exceptional flavor, fresh, perfectly prepared",
      good: "Tastes great, well-cooked, enjoyable",
      average: "Decent taste, nothing special, slightly inconsistent",
      poor: "Blah, overcooked, or cold; unsatisfactory",
    },
  },
  {
    key: "ambiance",
    label: "Ambiance & vibe",
    descriptions: {
      outstanding: "Immersive, comfortable, great decor & music",
      good: "Clean, pleasant, consistent with theme",
      average: "Acceptable, slightly noisy, average setting",
      poor: "Uncomfortable, dirty, or distracting environment",
    },
  },
  {
    key: "price",
    label: "Price value",
    descriptions: {
      outstanding: "Unbelievable value, feels like a steal",
      good: "Reasonable price for the quality",
      average: "Standard market pricing, acceptable",
      poor: "Overpriced, feels like poor value",
    },
  },
  {
    key: "again",
    label: "Would you go again?",
    descriptions: {
      outstanding: "Absolutely! Can't wait for my next visit",
      good: "Yes, would definitely recommend",
      average: "Maybe, depends on other options",
      poor: "Definitely not, cross it off the list",
    },
  },
] as const satisfies readonly {
  key: string;
  label: string;
  descriptions: Record<RubricBandKey, string>;
}[];

export type RubricCategoryKey = (typeof RUBRIC_CATEGORIES)[number]["key"];

export const RUBRIC_MAX_TOTAL = RUBRIC_MAX_POINTS * RUBRIC_CATEGORIES.length;

/** A whole number from 1 to RUBRIC_MAX_POINTS. */
export function isRubricPoints(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= RUBRIC_MAX_POINTS;
}
