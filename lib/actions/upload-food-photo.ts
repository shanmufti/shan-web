"use server";

import config from "@payload-config";
import { revalidatePath } from "next/cache";
import { getPayload } from "payload";

import { getFoodTour, tourRestaurants } from "@/lib/food-tour";

export interface FoodPhotoState {
  error?: string;
  success?: string;
}

/** The browser shrinks photos first; this is a backstop. */
const MAX_BYTES = 4 * 1024 * 1024;
/** Per restaurant. Keeps a runaway phone from flooding the page. */
const MAX_PER_RESTAURANT = 100;

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
  const restaurant = tourRestaurants(tour).find(
    (r) => r.id === text(formData, "restaurantId"),
  );
  if (!restaurant) return { error: "Pick which restaurant it's from." };

  try {
    const payload = await getPayload({ config });
    const { totalDocs } = await payload.count({
      collection: "food-tour-photos",
      where: { restaurantId: { equals: restaurant.id } },
      overrideAccess: true,
    });
    if (totalDocs >= MAX_PER_RESTAURANT) {
      return { error: "This stop has plenty of photos already." };
    }

    await payload.create({
      collection: "food-tour-photos",
      data: {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
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
