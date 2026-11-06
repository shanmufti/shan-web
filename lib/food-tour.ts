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

export interface TourParticipant {
  id: string;
  name: string;
}

export function tourParticipants(tour: Tour): TourParticipant[] {
  return (tour.participants ?? []).flatMap((p) =>
    p.id ? [{ id: p.id, name: p.name }] : [],
  );
}

/** False when there's no reveal date yet, so an unset tour stays sealed. */
export function isRevealed(tour: Tour, now = new Date()): boolean {
  if (!tour.revealAt) return false;
  return now.getTime() >= new Date(tour.revealAt).getTime();
}

export interface Submission {
  participantId: string;
  restaurantId: string;
  submittedAt: string;
}

/**
 * Who has submitted for which restaurant, and when. Safe to show before the
 * reveal: the query selects only these fields, never the scores or comments.
 */
export async function listSubmissions(): Promise<Submission[]> {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "food-ratings",
    limit: 0,
    pagination: false,
    depth: 0,
    select: { participantId: true, restaurantId: true, updatedAt: true },
    overrideAccess: true,
  });
  return docs.map((d) => ({
    participantId: d.participantId,
    restaurantId: d.restaurantId,
    submittedAt: d.updatedAt,
  }));
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
    overrideAccess: true,
  });

  // Prefer the current restaurant name from the tour (it may have been renamed).
  const currentNames = new Map(
    tourRestaurants(tour).map((r) => [r.id, r.name]),
  );
  const currentPeople = new Map(
    tourParticipants(tour).map((p) => [p.id, p.name]),
  );

  const groups = new Map<string, FoodRating[]>();
  for (const doc of docs) {
    doc.name = currentPeople.get(doc.participantId) ?? doc.name;
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
      ratings: ratings.sort((a, b) => a.name.localeCompare(b.name)),
    };
  });

  return results.sort(
    (a, b) => b.averageTotal - a.averageTotal || b.count - a.count,
  );
}
