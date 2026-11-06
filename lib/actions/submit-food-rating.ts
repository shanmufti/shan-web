"use server";

import config from "@payload-config";
import { revalidatePath } from "next/cache";
import { getPayload } from "payload";

import {
  isRubricPoints,
  RUBRIC_CATEGORIES,
  type RubricCategoryKey,
  type RubricPoints,
} from "@/lib/food-rubric";
import {
  getFoodTour,
  isRevealed,
  tourParticipants,
  tourRestaurants,
} from "@/lib/food-tour";

export interface FoodRatingState {
  error?: string;
  success?: string;
  /** Bumps on every success so the form can reset its scores. */
  submittedAt?: number;
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitFoodRating(
  _prev: FoodRatingState,
  formData: FormData,
): Promise<FoodRatingState> {
  // Honeypot: bots fill every field. Pretend it worked.
  if (text(formData, "company") !== "") {
    return {
      success: "Thanks — your rubric is sealed.",
      submittedAt: Date.now(),
    };
  }

  const tour = await getFoodTour();
  if (!tour.revealAt) {
    return { error: "This food tour isn't set up yet." };
  }
  if (isRevealed(tour)) {
    return { error: "Results are out, so rubrics are closed." };
  }
  if (tour.acceptingRatings === false) {
    return { error: "Rubrics are paused right now." };
  }

  const participantId = text(formData, "participantId");
  const participant = tourParticipants(tour).find(
    (p) => p.id === participantId,
  );
  if (!participant) {
    return { error: "Pick your name." };
  }

  const restaurantId = text(formData, "restaurantId");
  const restaurant = tourRestaurants(tour).find((r) => r.id === restaurantId);
  if (!restaurant) {
    return { error: "Pick a restaurant." };
  }

  const scores = {} as Record<RubricCategoryKey, RubricPoints>;
  for (const category of RUBRIC_CATEGORIES) {
    const value = Number(text(formData, category.key));
    if (!isRubricPoints(value)) {
      return { error: `Choose a score for “${category.label}”.` };
    }
    scores[category.key] = value;
  }

  const comment = text(formData, "comment").slice(0, 500);
  const total = Object.values(scores).reduce((sum, v) => sum + v, 0);
  const key = `${restaurant.id}:${participant.id}`;
  const data = {
    key,
    participantId: participant.id,
    name: participant.name,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    ...scores,
    total,
    comment: comment === "" ? null : comment,
  };

  try {
    const payload = await getPayload({ config });
    const existing = await payload.find({
      collection: "food-ratings",
      where: { key: { equals: key } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const prior = existing.docs[0];

    if (prior) {
      await payload.update({
        collection: "food-ratings",
        id: prior.id,
        data,
        overrideAccess: true,
      });
    } else {
      await payload.create({
        collection: "food-ratings",
        data,
        overrideAccess: true,
      });
    }

    revalidatePath("/food-tour");
    return {
      success: prior
        ? `Thanks ${participant.name}, your rubric for ${restaurant.name} is updated. It stays sealed until the reveal.`
        : `Thanks ${participant.name}, your rubric for ${restaurant.name} is in and sealed until the reveal.`,
      submittedAt: Date.now(),
    };
  } catch {
    return { error: "Couldn't save that. Try again in a moment." };
  }
}
