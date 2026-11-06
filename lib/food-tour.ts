import config from "@payload-config";
import { getPayload } from "payload";

import type { FoodRating, FoodTour } from "@/payload-types";
import { RUBRIC_CATEGORIES, type RubricCategoryKey } from "@/lib/food-rubric";

/**
 * Required fields can still be missing before the global is first saved,
 * so treat them as optional here.
 */
export type Tour = Omit<FoodTour, "title" | "revealAt"> & {
  title?: string | null;
  revealAt?: string | null;
};

export interface TourRestaurant {
  id: string;
  name: string;
  neighbourhood?: string | null;
  visitedOn?: string | null;
}

export async function getFoodTour(): Promise<Tour> {
  const payload = await getPayload({ config });
  return payload.findGlobal({ slug: "food-tour", overrideAccess: true });
}

export function tourRestaurants(tour: Tour): TourRestaurant[] {
  return (tour.restaurants ?? []).flatMap((r) =>
    r.id ? [{ ...r, id: r.id }] : [],
  );
}

/** False when there's no reveal date yet, so an unset tour stays sealed. */
export function isRevealed(tour: Tour, now = new Date()): boolean {
  if (!tour.revealAt) return false;
  return now.getTime() >= new Date(tour.revealAt).getTime();
}

/** How many rubrics are in. Reveals nothing about the scores. */
export async function countRatings(): Promise<number> {
  const payload = await getPayload({ config });
  const { totalDocs } = await payload.count({
    collection: "food-ratings",
    overrideAccess: true,
  });
  return totalDocs;
}

export interface RestaurantResult {
  restaurantId: string;
  restaurantName: string;
  count: number;
  averageTotal: number;
  averages: Record<RubricCategoryKey, number>;
  ratings: FoodRating[];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * The only code path that reads rubric scores. Throws before the reveal date
 * so a future caller can't leak results by forgetting to check.
 */
export async function getRevealedResults(
  tour: Tour,
): Promise<RestaurantResult[]> {
  if (!isRevealed(tour)) {
    throw new Error("Food tour results are sealed until the reveal date.");
  }

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "food-ratings",
    limit: 0,
    pagination: false,
    sort: "name",
    overrideAccess: true,
  });

  // Prefer the current restaurant name from the tour (it may have been renamed).
  const currentNames = new Map(
    tourRestaurants(tour).map((r) => [r.id, r.name]),
  );

  const groups = new Map<string, FoodRating[]>();
  for (const doc of docs) {
    const list = groups.get(doc.restaurantId) ?? [];
    list.push(doc);
    groups.set(doc.restaurantId, list);
  }

  const results = [...groups.entries()].map(([restaurantId, ratings]) => {
    const averages = Object.fromEntries(
      RUBRIC_CATEGORIES.map((c) => [
        c.key,
        average(ratings.map((r) => r[c.key])),
      ]),
    ) as Record<RubricCategoryKey, number>;
    return {
      restaurantId,
      restaurantName:
        currentNames.get(restaurantId) ?? ratings[0]?.restaurantName ?? "",
      count: ratings.length,
      averageTotal: average(ratings.map((r) => r.total)),
      averages,
      ratings,
    };
  });

  return results.sort(
    (a, b) => b.averageTotal - a.averageTotal || b.count - a.count,
  );
}
