"use server";

import config from "@payload-config";
import { revalidatePath } from "next/cache";
import { getPayload } from "payload";

import {
  getFoodTour,
  tourParticipants,
  tourRestaurants,
} from "@/lib/food-tour";

export interface FoodPhotoState {
  error?: string;
  success?: string;
}

/** The browser shrinks photos first; this is a backstop. */
const MAX_BYTES = 4 * 1024 * 1024;
/** Per person, per restaurant. Keeps a runaway phone from flooding the page. */
const MAX_PER_PERSON = 30;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Saves one photo. The form calls this once per picked file. */
export async function uploadFoodPhoto(
  formData: FormData,
): Promise<FoodPhotoState> {
  if (text(formData, "company") !== "") return { success: "Thanks!" };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pick a photo." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "That file isn't a photo." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That photo is too big. Try a smaller one." };
  }

  const tour = await getFoodTour();
  const participant = tourParticipants(tour).find(
    (p) => p.id === text(formData, "participantId"),
  );
  if (!participant) return { error: "Pick your name first." };
  const restaurant = tourRestaurants(tour).find(
    (r) => r.id === text(formData, "restaurantId"),
  );
  if (!restaurant) return { error: "Pick which restaurant it's from." };

  try {
    const payload = await getPayload({ config });
    const { totalDocs } = await payload.count({
      collection: "food-tour-photos",
      where: {
        and: [
          { restaurantId: { equals: restaurant.id } },
          { participantId: { equals: participant.id } },
        ],
      },
      overrideAccess: true,
    });
    if (totalDocs >= MAX_PER_PERSON) {
      return {
        error: `That's ${String(MAX_PER_PERSON)} photos for this stop. Plenty!`,
      };
    }

    const caption = text(formData, "caption").slice(0, 140);
    await payload.create({
      collection: "food-tour-photos",
      data: {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        participantId: participant.id,
        name: participant.name,
        caption: caption === "" ? null : caption,
      },
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        mimetype: file.type,
        name: file.name || "photo.jpg",
        size: file.size,
      },
      overrideAccess: true,
    });
    revalidatePath("/food-tour");
    return { success: "Added!" };
  } catch {
    return { error: "Couldn't save that photo. Try again in a moment." };
  }
}
