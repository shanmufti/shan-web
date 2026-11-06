import type { FoodPhoto, TourRestaurant } from "@/lib/food-tour";

// Fixed, so server and client agree; feels random enough.
const TILTS = [
  "-rotate-3",
  "rotate-2",
  "-rotate-1",
  "rotate-3",
  "rotate-1",
  "-rotate-2",
];

function Polaroid({
  photo,
  index,
}: Readonly<{ photo: FoodPhoto; index: number }>) {
  const label = [photo.caption, photo.name ? `— ${photo.name}` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <a
      href={photo.full}
      target="_blank"
      rel="noreferrer"
      className={`block break-inside-avoid rounded-sm bg-white p-2 pb-3 shadow-md ring-1 ring-black/5 transition-transform duration-300 hover:z-10 hover:scale-105 hover:rotate-0 ${TILTS[index % TILTS.length] ?? ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumb}
        alt={photo.caption ?? "Food tour photo"}
        width={photo.width ?? undefined}
        height={photo.height ?? undefined}
        loading="lazy"
        className="h-auto w-full"
      />
      {label ? (
        <span className="mt-2 block text-center font-mono text-[0.7rem] leading-snug text-neutral-600">
          {label}
        </span>
      ) : null}
    </a>
  );
}

/** Photos grouped by stop, as a scatter of tilted polaroids. */
export function FoodPhotoWall({
  photos,
  restaurants,
}: Readonly<{ photos: FoodPhoto[]; restaurants: TourRestaurant[] }>) {
  const groups = restaurants
    .map((r) => ({
      restaurant: r,
      photos: photos.filter((p) => p.restaurantId === r.id),
    }))
    .filter((g) => g.photos.length > 0);

  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No photos yet. Be the first.
      </p>
    );
  }

  return (
    <div className="space-y-12">
      {groups.map(({ restaurant, photos: items }) => (
        <div key={restaurant.id}>
          <h3 className="font-heading text-xl">
            {restaurant.name}
            {restaurant.cuisine ? (
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                {restaurant.cuisine}
              </span>
            ) : null}
          </h3>
          <div className="mt-5 columns-2 gap-5 space-y-5 sm:columns-3">
            {items.map((photo, index) => (
              <Polaroid key={photo.id} photo={photo} index={index} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
