import { FoodPhotoUpload } from "@/components/food-photo-upload";
import { FoodPhotoWall } from "@/components/food-photo-wall";
import type { FoodPhoto, TourRestaurant } from "@/lib/food-tour";

export function FoodPhotosSection({
  photos,
  restaurants,
}: Readonly<{
  photos: FoodPhoto[];
  restaurants: TourRestaurant[];
}>) {
  if (restaurants.length === 0) return null;
  return (
    <section aria-labelledby="photos" className="mt-16">
      <h2 id="photos" className="font-heading text-2xl">
        Photos
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Evidence from each stop.
      </p>
      <div className="mt-6">
        <FoodPhotoWall photos={photos} restaurants={restaurants} />
      </div>
      <div className="relative mt-8">
        <FoodPhotoUpload
          restaurants={restaurants.map((r) => ({ id: r.id, name: r.name }))}
        />
      </div>
    </section>
  );
}
