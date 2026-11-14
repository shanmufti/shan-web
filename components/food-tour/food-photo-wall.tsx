"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { FoodPhoto, TourRestaurant } from "@/lib/food-tour";

interface Group {
  restaurant: TourRestaurant;
  photos: FoodPhoto[];
}

/** Full-screen viewer: swipe (or arrow keys) through one stop's photos. */
function Viewer({
  photos,
  start,
  onClose,
}: Readonly<{ photos: FoodPhoto[]; start: number; onClose: () => void }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);

  useEffect(() => {
    const dialog = dialogRef.current;
    const track = trackRef.current;
    if (!dialog || !track) return;
    dialog.showModal();
    track.scrollTo({ left: start * track.clientWidth, behavior: "instant" });
  }, [start]);

  function go(next: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(photos.length - 1, next));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
    >
      <div
        ref={trackRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex h-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-contain"
      >
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="flex h-full w-screen shrink-0 snap-center items-center justify-center p-4 sm:p-12"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={Math.abs(i - index) <= 1 ? photo.full : photo.thumb}
              alt={`Food tour, ${String(i + 1)} of ${String(photos.length)}`}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ))}
      </div>

      <p className="absolute top-4 left-4 font-mono text-sm text-white/70">
        {index + 1} / {photos.length}
      </p>
      <button
        type="button"
        onClick={() => dialogRef.current?.close()}
        aria-label="Close"
        className="absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-white/10"
      >
        <X className="size-6" aria-hidden="true" />
      </button>
      {index > 0 ? (
        <button
          type="button"
          onClick={() => {
            go(index - 1);
          }}
          aria-label="Previous photo"
          className="absolute top-1/2 left-2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:inline-flex"
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </button>
      ) : null}
      {index < photos.length - 1 ? (
        <button
          type="button"
          onClick={() => {
            go(index + 1);
          }}
          aria-label="Next photo"
          className="absolute top-1/2 right-2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:inline-flex"
        >
          <ChevronRight className="size-6" aria-hidden="true" />
        </button>
      ) : null}
    </dialog>
  );
}

/**
 * One swipeable row of square thumbnails per stop. Stays one row tall no
 * matter how many photos come in; tap one to open the viewer.
 */
export function FoodPhotoWall({
  photos,
  restaurants,
}: Readonly<{ photos: FoodPhoto[]; restaurants: TourRestaurant[] }>) {
  const [open, setOpen] = useState<{ group: number; start: number } | null>(
    null,
  );

  const groups: Group[] = restaurants
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

  const openGroup = open ? groups[open.group] : undefined;

  return (
    <div className="space-y-8">
      {groups.map(({ restaurant, photos: items }, groupIndex) => (
        <div key={restaurant.id}>
          <h3 className="flex items-baseline gap-2">
            <span className="font-heading text-xl">{restaurant.name}</span>
            <span className="text-muted-foreground font-mono text-xs">
              {items.length} {items.length === 1 ? "photo" : "photos"}
            </span>
          </h3>
          <ul className="-mx-6 mt-3 flex snap-x [scrollbar-width:thin] gap-2 overflow-x-auto px-6 pb-2 lg:-mx-10 lg:px-10">
            {items.map((photo, index) => (
              <li key={photo.id} className="shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => {
                    setOpen({ group: groupIndex, start: index });
                  }}
                  aria-label={`Open photo ${String(index + 1)} of ${String(items.length)} from ${restaurant.name}`}
                  className="bg-muted block size-28 overflow-hidden rounded-md sm:size-36"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumb}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {open && openGroup ? (
        <Viewer
          key={`${String(open.group)}-${String(open.start)}`}
          photos={openGroup.photos}
          start={open.start}
          onClose={() => {
            setOpen(null);
          }}
        />
      ) : null}
    </div>
  );
}
