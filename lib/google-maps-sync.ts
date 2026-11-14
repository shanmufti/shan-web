/**
 * What scripts/import-google-maps.ts writes for each destination and place.
 * Pure functions, so re-run behaviour (what's refreshed, what's kept) is
 * testable without a database.
 */
import type { Destination, Place } from "../payload-types";

import {
  guessCategory,
  isPlaceholderName,
  type DestinationPlan,
  type SavedPlace,
} from "./google-maps-takeout";

export type PlaceVisibility = "public" | "private" | "owner";

/**
 * Changes for an existing destination, or null when nothing changed. Only
 * fills gaps and appends list names: never touches title, write-up, draft
 * or visibility.
 */
export function destinationChanges(
  current: Pick<
    Destination,
    "sourceLists" | "coordinates" | "country" | "importedNotes"
  >,
  dest: DestinationPlan,
): Record<string, unknown> | null {
  const data: Record<string, unknown> = {};
  const lists = current.sourceLists ?? [];
  const missing = dest.lists.filter((l) => !lists.includes(l));
  if (missing.length > 0) data["sourceLists"] = [...lists, ...missing];
  if (current.coordinates?.lat == null && dest.centroid) {
    data["coordinates"] = dest.centroid;
  }
  if (!current.country && dest.country) data["country"] = dest.country;
  if (dest.description && current.importedNotes !== dest.description) {
    data["importedNotes"] = dest.description;
  }
  return Object.keys(data).length > 0 ? data : null;
}

/** Fields the importer owns and refreshes on every run (name only once). */
function importFields(place: SavedPlace) {
  return {
    name: place.name,
    sourceList: place.lists.join(", "),
    ...(place.url ? { googleMapsUrl: place.url } : {}),
    ...(place.address ? { address: place.address } : {}),
    ...(place.coordinates ? { coordinates: place.coordinates } : {}),
  };
}

export function newPlace(
  place: SavedPlace,
  destination: number,
  visibility: PlaceVisibility,
) {
  const category = guessCategory(place.name);
  // Errands (laundry, car rental, an Airbnb address) are for me only.
  const placeVisibility: PlaceVisibility =
    category === "practical" ? "owner" : visibility;
  return {
    ...importFields(place),
    destination,
    category,
    visibility: placeVisibility,
    importKey: place.key,
    ...(place.note ? { note: place.note } : {}),
  };
}

function sameCoordinates(
  current: Place["coordinates"],
  next: { lat: number; lng: number } | undefined,
): boolean {
  if (!next) return true;
  return current?.lat === next.lat && current.lng === next.lng;
}

/**
 * Changes for an existing place, or null when nothing changed. Category and
 * visibility are never touched; the name only while it's still a
 * placeholder like "Dropped pin" (so renames in the admin stick); the note
 * only when it's still empty.
 */
export function placeChanges(
  current: Pick<
    Place,
    | "name"
    | "sourceList"
    | "googleMapsUrl"
    | "address"
    | "coordinates"
    | "destination"
    | "note"
  >,
  place: SavedPlace,
  destinationId: number | string,
): Record<string, unknown> | null {
  const fields = importFields(place);
  const update: Record<string, unknown> = {};
  const changed = (key: keyof typeof fields, value: unknown) =>
    value !== undefined && current[key] !== value;
  if (isPlaceholderName(current.name) && changed("name", fields.name)) {
    update["name"] = fields.name;
  }
  if (changed("sourceList", fields.sourceList)) {
    update["sourceList"] = fields.sourceList;
  }
  if (changed("googleMapsUrl", fields.googleMapsUrl)) {
    update["googleMapsUrl"] = fields.googleMapsUrl;
  }
  if (changed("address", fields.address)) update["address"] = fields.address;
  if (!sameCoordinates(current.coordinates, fields.coordinates)) {
    update["coordinates"] = fields.coordinates;
  }
  const currentDest =
    typeof current.destination === "object"
      ? current.destination.id
      : current.destination;
  if (currentDest !== destinationId) update["destination"] = destinationId;
  if (!current.note?.trim() && place.note) update["note"] = place.note;
  return Object.keys(update).length > 0 ? update : null;
}
