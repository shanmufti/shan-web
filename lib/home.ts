import config from "@payload-config";
import { getPayload } from "payload";

import type { GlobeArc, GlobePoint } from "@/components/home-globe";
import { listVisitedCountries } from "@/lib/content";
import { yearOf } from "@/lib/format-date";
import {
  journeyCountries,
  listJourneys,
  listStories,
  type JourneyDoc,
  type Listed,
  type StoryDoc,
} from "@/lib/journeys";

export type TimelineEntry =
  | {
      kind: "journey";
      key: string;
      date: string;
      item: Listed<JourneyDoc>;
      stories: Listed<StoryDoc>[];
    }
  | { kind: "story"; key: string; date: string; item: Listed<StoryDoc> };

export interface TimelineYear {
  year: number;
  entries: TimelineEntry[];
}

function listedDate<T extends { startDate?: string; date: string }>(
  item: Listed<T>,
): string {
  if (item.locked) return item.date;
  return item.doc.startDate ?? item.doc.date;
}

function journeyIdOf(story: StoryDoc): number | string | null {
  const journey = story.journey;
  if (journey === null || journey === undefined) return null;
  return typeof journey === "object" ? journey.id : journey;
}

type ListedJourney = Listed<JourneyDoc>;
type ListedStory = Listed<StoryDoc>;

const idOf = (item: Listed<{ id: number | string }>) =>
  item.locked ? item.id : item.doc.id;

/** Journeys with their stories nested; other stories stand alone. */
function buildTimeline(journeys: ListedJourney[], stories: ListedStory[]) {
  const shownJourneyIds = new Set(journeys.map(idOf));
  const storiesByJourney = new Map<number | string, ListedStory[]>();
  const standalone: ListedStory[] = [];

  for (const story of stories) {
    // Locked teasers carry no journey link, so they always stand alone.
    const parent = story.locked ? null : journeyIdOf(story.doc);
    if (parent !== null && shownJourneyIds.has(parent)) {
      storiesByJourney.set(parent, [
        ...(storiesByJourney.get(parent) ?? []),
        story,
      ]);
    } else {
      standalone.push(story);
    }
  }

  const entries: TimelineEntry[] = [
    ...journeys.map((item): TimelineEntry => ({
      kind: "journey",
      key: `journey-${String(idOf(item))}`,
      date: listedDate(item),
      item,
      // Oldest first inside a journey: reads like the trip unfolded.
      stories: (storiesByJourney.get(idOf(item)) ?? []).slice().reverse(),
    })),
    ...standalone.map((item): TimelineEntry => ({
      kind: "story",
      key: `story-${String(idOf(item))}`,
      date: listedDate(item),
      item,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const years: TimelineYear[] = [];
  for (const entry of entries) {
    const year = yearOf(entry.date);
    const last = years.at(-1);
    if (last?.year === year) last.entries.push(entry);
    else years.push({ year, entries: [entry] });
  }
  return { years, standalone };
}

function journeyGlobeData(journey: JourneyDoc) {
  const href = `/travel/${journey.slug}`;
  const stops = journey.stops ?? [];
  const points: GlobePoint[] = stops.map((stop) => ({
    lat: stop.lat,
    lng: stop.lng,
    label: `${stop.name} · ${journey.title}`,
    href,
  }));
  const { lat, lng } = journey.location;
  if (points.length === 0 && lat != null && lng != null) {
    points.push({ lat, lng, label: journey.title, href });
  }
  const arcs: GlobeArc[] = stops.slice(1).map((next, index) => {
    const prev = stops[index] ?? next;
    return {
      startLat: prev.lat,
      startLng: prev.lng,
      endLat: next.lat,
      endLng: next.lng,
    };
  });
  return { points, arcs };
}

/** Pins, routes and visited countries. Locked items never reveal places. */
function buildGlobe(
  journeys: ListedJourney[],
  standalone: ListedStory[],
  visitedCodes: string[],
) {
  const points: GlobePoint[] = [];
  const arcs: GlobeArc[] = [];
  const codes = new Set(visitedCodes.map((code) => code.toUpperCase()));

  for (const item of journeys) {
    if (item.locked) continue;
    journeyCountries(item.doc).forEach((code) => codes.add(code));
    const data = journeyGlobeData(item.doc);
    points.push(...data.points);
    arcs.push(...data.arcs);
  }

  for (const item of standalone) {
    if (item.locked) continue;
    const { lat, lng, name } = item.doc.location ?? {};
    if (lat == null || lng == null) continue;
    points.push({
      lat,
      lng,
      label: name ? `${name} · ${item.doc.title}` : item.doc.title,
      href: `/blog/${item.doc.slug}`,
    });
  }

  const first = points[0];
  return {
    visitedCodes: [...codes],
    points,
    arcs,
    focus: first ? { lat: first.lat, lng: first.lng } : null,
  };
}

export async function getHomeData() {
  const payload = await getPayload({ config });
  const [journeys, stories, visitedCountries, dives] = await Promise.all([
    listJourneys(),
    listStories(),
    listVisitedCountries(),
    payload.count({
      collection: "diving",
      where: { draft: { equals: false } },
      overrideAccess: false,
    }),
  ]);

  const { years, standalone } = buildTimeline(journeys, stories);
  const globe = buildGlobe(
    journeys,
    standalone,
    visitedCountries.map((c) => c.country),
  );

  return {
    years,
    globe,
    stats: {
      countries: globe.visitedCodes.length,
      journeys: journeys.length,
      stories: stories.length,
      dives: dives.totalDocs,
    },
  };
}
