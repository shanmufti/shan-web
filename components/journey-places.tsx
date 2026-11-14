import { ExternalLink, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { plural } from "@/lib/hub-filters";
import {
  groupPlaces,
  type DestinationPlaces,
  type PlaceView,
} from "@/lib/places";

/**
 * Anchor for a place row, so a journey write-up can link to it with
 * `#place-<id>` (the id is the place's id in /admin).
 */
export function placeAnchor(id: number): string {
  return `place-${String(id)}`;
}

/** Places shown per category before the rest folds into "Show all". */
const VISIBLE_PER_CATEGORY = 12;

function RestrictedBadge({
  visibility,
}: Readonly<{ visibility: PlaceView["visibility"] }>) {
  if (visibility === "public") return null;
  return (
    <Badge variant="outline">
      <Lock aria-hidden="true" />
      {visibility === "owner" ? "Only you" : "Private"}
    </Badge>
  );
}

function PlaceRow({ place }: Readonly<{ place: PlaceView }>) {
  return (
    <li
      id={placeAnchor(place.id)}
      className="border-border min-w-0 scroll-mt-24 border-t py-2.5"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium break-words">{place.name}</span>
        <RestrictedBadge visibility={place.visibility} />
      </div>
      {place.note ? (
        <p className="text-muted-foreground mt-0.5 text-[0.95rem] leading-relaxed break-words whitespace-pre-line">
          {place.note}
        </p>
      ) : null}
      {place.url ? (
        <a
          href={place.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary focus-visible:outline-ring mt-0.5 inline-flex items-center gap-1 rounded-sm text-[0.8rem] font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Open in Google Maps
          <ExternalLink className="size-3" aria-hidden="true" />
          <span className="sr-only">
            {" "}
            for {place.name} (opens in a new tab)
          </span>
        </a>
      ) : null}
    </li>
  );
}

/** Two columns from sm up; each row has a top rule. */
const LIST = "grid gap-x-8 sm:grid-cols-2";

function CategoryList({
  id,
  label,
  places,
  headingLevel,
}: Readonly<{
  id: string;
  label: string;
  places: PlaceView[];
  headingLevel: 3 | 4;
}>) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  const shown = places.slice(0, VISIBLE_PER_CATEGORY);
  const rest = places.slice(VISIBLE_PER_CATEGORY);
  return (
    <section aria-labelledby={id} className="mt-6">
      <Heading id={id} className="meta-label text-muted-foreground">
        {label} · {places.length}
      </Heading>
      <ul className={`${LIST} mt-2`}>
        {shown.map((place) => (
          <PlaceRow key={place.id} place={place} />
        ))}
      </ul>
      {rest.length > 0 ? (
        <details className="group mt-2">
          <summary className="text-primary focus-visible:outline-ring w-fit cursor-pointer rounded-sm py-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
            <span className="group-open:hidden">
              Show all {places.length} {label.toLowerCase()}
            </span>
            <span className="hidden group-open:inline">
              Show fewer {label.toLowerCase()}
            </span>
          </summary>
          <ul className={`${LIST} mt-1`}>
            {rest.map((place) => (
              <PlaceRow key={place.id} place={place} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

/**
 * "Places I saved" on a journey page: the places of every destination linked
 * to the journey, already filtered for this viewer. Renders nothing when
 * there are none.
 */
export function JourneyPlaces({
  destinations,
}: Readonly<{ destinations: DestinationPlaces[] }>) {
  const total = destinations.reduce((sum, d) => sum + d.places.length, 0);
  if (total === 0) return null;
  const several = destinations.length > 1;
  return (
    <section aria-labelledby="saved-places" className="mt-16">
      <h2 id="saved-places" className="text-2xl font-medium tracking-[-0.03em]">
        Places I saved
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        {plural(total, "place", "places")} from my Google Maps lists
        {several
          ? `, in ${plural(destinations.length, "destination", "destinations")}`
          : ""}
        .
      </p>
      {destinations.map((destination) => {
        const groups = groupPlaces(destination.places);
        const prefix = `places-${String(destination.id)}`;
        const lists = groups.map((group) => (
          <CategoryList
            key={group.category}
            id={`${prefix}-${group.category}`}
            label={group.label}
            places={group.places}
            headingLevel={several ? 4 : 3}
          />
        ));
        return several ? (
          <section
            key={destination.id}
            aria-labelledby={prefix}
            className="mt-12"
          >
            <h3 id={prefix} className="text-xl font-medium tracking-tight">
              {destination.title}
            </h3>
            {lists}
          </section>
        ) : (
          <div key={destination.id}>{lists}</div>
        );
      })}
    </section>
  );
}
