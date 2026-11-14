/**
 * Pure helpers for scripts/import-google-maps.ts: read a Google Takeout
 * "Saved" export (one CSV per list, plus "Saved Places.json" GeoJSON for
 * starred places), pull coordinates out of Maps URLs, dedupe, and plan which
 * places go to which destination. No Payload or file system access here, so
 * it can be tested on its own (scripts/import-google-maps.test.ts).
 */

import { formatSlug } from "./slug";

export const PLACE_CATEGORIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Cafe" },
  { value: "bar", label: "Bar" },
  { value: "viewpoint", label: "Viewpoint" },
  { value: "hotel", label: "Hotel" },
  { value: "dive-shop", label: "Dive shop" },
  { value: "activity", label: "Activity" },
  { value: "shop", label: "Shop" },
  { value: "other", label: "Other" },
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number]["value"];

export function categoryLabel(value: string | null | undefined): string {
  return PLACE_CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface SavedPlace {
  /** Stable identity across exports and re-runs (see placeKey). */
  key: string;
  name: string;
  note: string;
  url: string | null;
  coordinates: LatLng | null;
  address: string | null;
  /** Every Maps list this place was saved in. */
  lists: string[];
}

export interface SavedList {
  name: string;
  /** Free-text list description, when the export has one. */
  description: string;
  placeKeys: string[];
}

export interface TakeoutData {
  lists: SavedList[];
  places: Map<string, SavedPlace>;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// CSV

// One field plus the separator after it: a quoted field ("" is a literal
// quote) or a bare field, then a comma, a line break or the end.
const CSV_FIELD = /(?:"((?:[^"]|"")*)"|([^,\r\n"]*))(,|\r\n|\n|\r|$)/y;

/** RFC 4180 CSV: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const input = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  CSV_FIELD.lastIndex = 0;
  while (CSV_FIELD.lastIndex < input.length) {
    const match = CSV_FIELD.exec(input);
    if (!match) break;
    row.push(match[1]?.replaceAll('""', '"') ?? match[2] ?? "");
    const separator = match[3] ?? "";
    if (separator !== ",") {
      rows.push(row);
      row = [];
      if (separator === "") break;
    }
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

// ---------------------------------------------------------------------------
// URLs and coordinates

function validLatLng(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // Takeout writes 0,0 for places it has no coordinates for.
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

const NUM = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
const PAIR = new RegExp(String.raw`^\s*${NUM}\s*,\s*${NUM}\s*$`);

function pairFrom(value: string | null | undefined): LatLng | null {
  if (!value) return null;
  const match = PAIR.exec(value);
  return match ? validLatLng(Number(match[1]), Number(match[2])) : null;
}

/**
 * Coordinates from a Google Maps URL, in order of precision:
 * `!3d<lat>!4d<lng>` (the place itself), `?q=`/`query=`/`ll=` pairs,
 * `/maps/search/<lat>,<lng>` or `/maps/place/<lat>,<lng>` (dropped pins),
 * then `@<lat>,<lng>` (the map viewport, close to the place).
 */
export function coordinatesFromUrl(url: string | null | undefined) {
  if (!url) return null;
  let decoded = url;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    // Keep the raw URL if it has a stray %.
  }
  const data = new RegExp(String.raw`!3d${NUM}!4d${NUM}`).exec(decoded);
  if (data) return validLatLng(Number(data[1]), Number(data[2]));

  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }
  if (parsed) {
    for (const key of ["q", "query", "ll", "destination"]) {
      const found = pairFrom(parsed.searchParams.get(key));
      if (found) return found;
    }
  }
  const path = new RegExp(
    String.raw`/maps/(?:search|place)/${NUM}\s*,\s*\+?${NUM}`,
  ).exec(decoded);
  if (path) return validLatLng(Number(path[1]), Number(path[2]));
  const at = new RegExp(String.raw`@${NUM},${NUM}`).exec(decoded);
  if (at) return validLatLng(Number(at[1]), Number(at[2]));
  return null;
}

/**
 * Google's numeric place id (cid). CSV exports carry it as the second half of
 * the `!1s0x…:0x…` feature id; GeoJSON exports as `?cid=`. Normalising both
 * lets a starred place and the same place in a list dedupe.
 */
export function cidFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const cid = /[?&]cid=(\d+)/.exec(url);
  if (cid?.[1]) return cid[1];
  const ftid = /!1s0x[0-9a-f]+:0x([0-9a-f]+)/i.exec(url);
  if (ftid?.[1]) {
    try {
      return BigInt(`0x${ftid[1]}`).toString();
    } catch {
      return null;
    }
  }
  return null;
}

/** Place name from /maps/place/<Name>/…, for rows with an empty Title. */
export function nameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = /\/maps\/place\/([^/@?]+)/.exec(url);
  if (!match?.[1]) return null;
  try {
    const name = decodeURIComponent(match[1].replaceAll("+", " ")).trim();
    return pairFrom(name) ? null : name || null;
  } catch {
    return null;
  }
}

function normaliseName(name: string) {
  return name
    .normalize("NFKD")
    .replaceAll(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Identity used to dedupe and to match rows on re-runs. */
export function placeKey(input: {
  name: string;
  url: string | null;
  coordinates: LatLng | null;
}): string {
  const cid = cidFromUrl(input.url);
  if (cid) return `cid:${cid}`;
  const name = normaliseName(input.name);
  if (input.coordinates) {
    const { lat, lng } = input.coordinates;
    return `geo:${name}@${lat.toFixed(4)},${lng.toFixed(4)}`;
  }
  if (input.url) return `url:${input.url.trim()}`;
  return `name:${name}`;
}

/** URL-safe slug that keeps accented letters (Café → cafe). */
export function slugify(value: string): string {
  return formatSlug(value.normalize("NFKD").replaceAll(/[̀-ͯ]/g, ""));
}

// ---------------------------------------------------------------------------
// Reading an export

function addPlace(
  data: TakeoutData,
  list: SavedList,
  input: Omit<SavedPlace, "key" | "lists">,
) {
  const key = placeKey(input);
  const existing = data.places.get(key);
  if (existing) {
    // Same place saved twice: fill gaps, keep every note and list.
    existing.coordinates ??= input.coordinates;
    existing.address ??= input.address;
    existing.url ??= input.url;
    if (input.note && !existing.note.includes(input.note)) {
      existing.note = existing.note
        ? `${existing.note}\n${input.note}`
        : input.note;
    }
    if (!existing.lists.includes(list.name)) existing.lists.push(list.name);
  } else {
    data.places.set(key, { ...input, key, lists: [list.name] });
  }
  if (!list.placeKeys.includes(key)) list.placeKeys.push(key);
}

export function emptyTakeout(): TakeoutData {
  return { lists: [], places: new Map(), warnings: [] };
}

function listNamed(data: TakeoutData, name: string): SavedList {
  let list = data.lists.find((l) => l.name === name);
  if (!list) {
    list = { name, description: "", placeKeys: [] };
    data.lists.push(list);
  }
  return list;
}

/**
 * One saved-list CSV. Takeout columns are Title, Note, URL and sometimes
 * Tags and Comment. A row with no Title and no URL but some text before the
 * first place is taken as the list's description.
 */
export function readListCsv(data: TakeoutData, listName: string, text: string) {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
  const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
  const col = (name: string) => header.indexOf(name);
  const [title, note, url, comment] = [
    col("title"),
    col("note"),
    col("url"),
    col("comment"),
  ];
  if (title < 0 || url < 0) {
    data.warnings.push(
      `${listName}: no Title/URL header, skipped (got: ${header.join(", ")})`,
    );
    return;
  }
  const list = listNamed(data, listName);
  const cell = (row: string[], index: number) =>
    index >= 0 ? (row[index] ?? "").trim() : "";

  for (const row of rows) {
    const rowUrl = cell(row, url);
    const rowTitle = cell(row, title);
    const text = [cell(row, note), cell(row, comment)]
      .filter(Boolean)
      .filter((v, i, all) => all.indexOf(v) === i)
      .join("\n");
    if (!rowTitle && !rowUrl) {
      if (text && list.placeKeys.length === 0) {
        list.description = list.description
          ? `${list.description}\n\n${text}`
          : text;
      }
      continue;
    }
    const name = rowTitle || (nameFromUrl(rowUrl) ?? "Unnamed place");
    addPlace(data, list, {
      name,
      note: text,
      url: rowUrl || null,
      coordinates: coordinatesFromUrl(rowUrl),
      address: null,
    });
  }
}

interface GeoFeature {
  geometry?: { coordinates?: unknown } | null;
  properties?: Record<string, unknown> | null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * "Saved Places.json" (starred places), GeoJSON. Handles the current shape
 * (`google_maps_url`, `location.name/address`, `Comment`) and the older one
 * (`Google Maps URL`, `Location.Business Name/Address/Geo Coordinates`).
 */
export function readSavedPlacesJson(
  data: TakeoutData,
  listName: string,
  text: string,
) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    data.warnings.push(`${listName}: not valid JSON, skipped`);
    return;
  }
  const features = obj(parsed)["features"];
  if (!Array.isArray(features)) {
    data.warnings.push(`${listName}: no GeoJSON features, skipped`);
    return;
  }
  const list = listNamed(data, listName);
  for (const raw of features as GeoFeature[]) {
    const props = obj(raw.properties);
    const location = obj(props["location"] ?? props["Location"]);
    const url = str(props["google_maps_url"] ?? props["Google Maps URL"]);
    const geo = obj(location["Geo Coordinates"]);
    const coords = Array.isArray(raw.geometry?.coordinates)
      ? (raw.geometry.coordinates as unknown[])
      : [];
    const fromGeometry =
      typeof coords[0] === "number" && typeof coords[1] === "number"
        ? validLatLng(coords[1], coords[0])
        : null;
    const fromLegacy =
      geo["Latitude"] == null
        ? null
        : validLatLng(Number(geo["Latitude"]), Number(geo["Longitude"]));
    const name =
      str(location["name"]) ||
      str(location["Business Name"]) ||
      str(props["Title"]) ||
      (nameFromUrl(url) ?? (str(location["address"]) || "Unnamed place"));
    addPlace(data, list, {
      name,
      note: str(props["Comment"] ?? props["comment"]),
      url: url || null,
      coordinates: fromGeometry ?? fromLegacy ?? coordinatesFromUrl(url),
      address: str(location["address"] ?? location["Address"]) || null,
    });
  }
}

// ---------------------------------------------------------------------------
// Planning: lists → destinations

/** Lists that span many places, so they go to the review file instead. */
const CATCH_ALL = new Set([
  "want to go",
  "favorites",
  "favourites",
  "favorite places",
  "favourite places",
  "starred places",
  "saved places",
  "travel plans",
  "default list",
  "labeled places",
  "my places",
  "to try",
]);

export function isCatchAllList(name: string): boolean {
  return CATCH_ALL.has(name.trim().toLowerCase());
}

const isWordChar = (char: string) => /[\p{L}\p{N}]/u.test(char);

/** Title for a destination stub made from a list name ("🇲🇽 Oaxaca!" → "Oaxaca"). */
export function destinationTitle(listName: string): string {
  // Code points are enough here: only leading and trailing symbols are cut.
  const chars = Array.from(listName.trim());
  const first = chars.findIndex(isWordChar);
  const last = chars.findLastIndex((c) => isWordChar(c) || c === ")");
  if (first < 0 || last < first) return listName.trim();
  return chars
    .slice(first, last + 1)
    .join("")
    .trim();
}

/**
 * Optional mapping file, by list name:
 * - "slug"                               → that destination (created if missing)
 * - { slug, title?, country? }           → same, with stub details
 * - "review"                             → treat as a catch-all list
 * - "skip"                               → ignore the list entirely
 */
export type ListMappingValue =
  string | { slug: string; title?: string; country?: string };
export type ListMapping = Record<string, ListMappingValue>;

export interface ExistingDestination {
  id: number | string;
  slug: string;
  title: string;
  sourceLists: string[];
  coordinates: LatLng | null;
}

export interface DestinationPlan {
  slug: string;
  title: string;
  country: string | null;
  lists: string[];
  description: string;
  existingId: number | string | null;
  placeKeys: string[];
  centroid: LatLng | null;
}

export interface ReviewRow {
  key: string;
  name: string;
  list: string;
  url: string;
  lat: string;
  lng: string;
  suggested: string;
  distanceKm: string;
  confidence: "high" | "medium" | "low" | "none";
}

export interface ImportPlan {
  destinations: DestinationPlan[];
  /** place key → destination slug */
  assignments: Map<string, string>;
  review: ReviewRow[];
  skippedLists: string[];
  warnings: string[];
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function centroid(points: LatLng[]): LatLng | null {
  if (points.length === 0) return null;
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  const round = (n: number) => Math.round(n * 1e5) / 1e5;
  return {
    lat: round(sum.lat / points.length),
    lng: round(sum.lng / points.length),
  };
}

function confidenceFor(km: number): ReviewRow["confidence"] {
  if (km <= 25) return "high";
  if (km <= 100) return "medium";
  return "low";
}

function resolveTarget(
  list: SavedList,
  mapping: ListMapping,
  existing: ExistingDestination[],
):
  | { kind: "skip" | "review" }
  | {
      kind: "destination";
      slug: string;
      title: string;
      country: string | null;
    } {
  const mapped = mapping[list.name];
  if (mapped === "skip" || mapped === "review") return { kind: mapped };
  if (typeof mapped === "string") {
    const slug = slugify(mapped);
    const known = existing.find((d) => d.slug === slug);
    return {
      kind: "destination",
      slug,
      title: known?.title ?? destinationTitle(list.name),
      country: null,
    };
  }
  if (mapped) {
    return {
      kind: "destination",
      slug: slugify(mapped.slug),
      title: mapped.title ?? destinationTitle(list.name),
      country: mapped.country?.toUpperCase() ?? null,
    };
  }
  if (isCatchAllList(list.name)) return { kind: "review" };
  const bySource = existing.find((d) => d.sourceLists.includes(list.name));
  const title = destinationTitle(list.name);
  return {
    kind: "destination",
    slug: bySource?.slug ?? slugify(title),
    title: bySource?.title ?? title,
    country: null,
  };
}

function appendText(current: string, more: string): string {
  return current ? `${current}\n\n${more}` : more;
}

function newDestination(
  slug: string,
  title: string,
  country: string | null,
  known: ExistingDestination | undefined,
): DestinationPlan {
  return {
    slug,
    title,
    country,
    lists: [],
    description: "",
    existingId: known?.id ?? null,
    placeKeys: [],
    centroid: known?.coordinates ?? null,
  };
}

interface PlanContext {
  data: TakeoutData;
  plan: ImportPlan;
  existing: ExistingDestination[];
}

function destinationFor(
  ctx: PlanContext,
  slug: string,
  title: string,
  country: string | null,
): DestinationPlan {
  let dest = ctx.plan.destinations.find((d) => d.slug === slug);
  if (!dest) {
    const known = ctx.existing.find((d) => d.slug === slug);
    dest = newDestination(slug, title, country, known);
    ctx.plan.destinations.push(dest);
  }
  return dest;
}

/** Puts a destination list's places on its destination. */
function assignList(ctx: PlanContext, list: SavedList, dest: DestinationPlan) {
  dest.lists.push(list.name);
  if (list.description) {
    dest.description = appendText(dest.description, list.description);
  }
  for (const key of list.placeKeys) {
    const already = ctx.plan.assignments.get(key);
    if (already && already !== dest.slug) {
      const name = ctx.data.places.get(key)?.name ?? key;
      ctx.plan.warnings.push(
        `"${name}" is in lists for ${already} and ${dest.slug}; kept in ${already}`,
      );
      continue;
    }
    ctx.plan.assignments.set(key, dest.slug);
    if (!dest.placeKeys.includes(key)) dest.placeKeys.push(key);
  }
}

function fillCentroids(ctx: PlanContext) {
  for (const dest of ctx.plan.destinations) {
    if (dest.centroid) continue;
    const points = dest.placeKeys.flatMap((k) => {
      const c = ctx.data.places.get(k)?.coordinates;
      return c ? [c] : [];
    });
    dest.centroid = centroid(points);
  }
}

/** A catch-all place: assigned from the review file, skipped, or for review. */
function placeFromReview(
  ctx: PlanContext,
  place: SavedPlace,
  list: string,
  chosen: string | undefined,
  known: Map<string, LatLng | null>,
) {
  if (chosen === "skip") return;
  if (!chosen) {
    ctx.plan.review.push(reviewRow(place, list, known));
    return;
  }
  const existing = ctx.existing.find((d) => d.slug === chosen);
  const planned = ctx.plan.destinations.find((d) => d.slug === chosen);
  if (!planned && !existing) {
    ctx.plan.warnings.push(
      `Review file sends "${place.name}" to unknown destination "${chosen}"; skipped`,
    );
    return;
  }
  const dest = destinationFor(ctx, chosen, existing?.title ?? chosen, null);
  ctx.plan.assignments.set(place.key, chosen);
  dest.placeKeys.push(place.key);
}

/**
 * Decide where every saved place goes. Destination lists win over catch-all
 * lists; a place in two destination lists goes to the first (alphabetical)
 * one, with a warning. Catch-all places become review rows with the nearest
 * destination suggested, unless `assigned` (from an edited review file)
 * already names a destination (or "skip") for them.
 */
export function planImport(
  data: TakeoutData,
  options: {
    mapping?: ListMapping;
    existing?: ExistingDestination[];
    /** place key → destination slug or "skip", from a filled-in review file */
    assigned?: Map<string, string>;
  } = {},
): ImportPlan {
  const mapping = options.mapping ?? {};
  const ctx: PlanContext = {
    data,
    existing: options.existing ?? [],
    plan: {
      destinations: [],
      assignments: new Map(),
      review: [],
      skippedLists: [],
      warnings: [],
    },
  };
  const reviewLists: SavedList[] = [];
  const lists = [...data.lists].sort((a, b) => a.name.localeCompare(b.name));

  for (const list of lists) {
    const target = resolveTarget(list, mapping, ctx.existing);
    if (target.kind === "destination") {
      const dest = destinationFor(
        ctx,
        target.slug,
        target.title,
        target.country,
      );
      assignList(ctx, list, dest);
    } else if (target.kind === "skip") {
      ctx.plan.skippedLists.push(list.name);
    } else {
      reviewLists.push(list);
    }
  }
  fillCentroids(ctx);

  const known = new Map<string, LatLng | null>();
  for (const d of ctx.existing) known.set(d.slug, d.coordinates);
  for (const d of ctx.plan.destinations) known.set(d.slug, d.centroid);

  for (const list of reviewLists) {
    for (const key of list.placeKeys) {
      const place = data.places.get(key);
      if (!place || ctx.plan.assignments.has(key)) continue;
      placeFromReview(ctx, place, list.name, options.assigned?.get(key), known);
    }
  }
  return ctx.plan;
}

function reviewRow(
  place: SavedPlace,
  list: string,
  known: Map<string, LatLng | null>,
): ReviewRow {
  let best: { slug: string; km: number } | null = null;
  if (place.coordinates) {
    for (const [slug, point] of known) {
      if (!point) continue;
      const km = haversineKm(place.coordinates, point);
      if (!best || km < best.km) best = { slug, km };
    }
  }
  return {
    key: place.key,
    name: place.name,
    list,
    url: place.url ?? "",
    lat: place.coordinates ? String(place.coordinates.lat) : "",
    lng: place.coordinates ? String(place.coordinates.lng) : "",
    suggested: best?.slug ?? "",
    distanceKm: best ? best.km.toFixed(1) : "",
    confidence: best ? confidenceFor(best.km) : "none",
  };
}

// ---------------------------------------------------------------------------
// Review file (CSV out, CSV back in)

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export const REVIEW_HEADER = [
  "key",
  "name",
  "list",
  "url",
  "lat",
  "lng",
  "suggested",
  "distance_km",
  "confidence",
  "destination",
] as const;

/**
 * Review CSV for catch-all places. Fill the `destination` column with a
 * destination slug (copy `suggested` if it's right) or "skip", then re-run
 * with assign=<file>. Blank rows stay in the next review file.
 */
export function reviewCsv(plan: ImportPlan): string {
  const lines = [REVIEW_HEADER.join(",")];
  for (const row of plan.review) {
    lines.push(
      [
        row.key,
        row.name,
        row.list,
        row.url,
        row.lat,
        row.lng,
        row.suggested,
        row.distanceKm,
        row.confidence,
        "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

/** key → destination slug (or "skip") from a filled-in review CSV. */
export function readAssignments(text: string): Map<string, string> {
  const rows = parseCsv(text);
  const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
  const keyCol = header.indexOf("key");
  const destCol = header.indexOf("destination");
  const out = new Map<string, string>();
  if (keyCol < 0 || destCol < 0) return out;
  for (const row of rows) {
    const key = (row[keyCol] ?? "").trim();
    const dest = slugify((row[destCol] ?? "").trim());
    if (key && dest) out.set(key, dest);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Category guess (only used when a place is first created)

const CATEGORY_WORDS: [PlaceCategory, string[]][] = [
  ["dive-shop", ["dive", "diving", "scuba", "buceo"]],
  [
    "cafe",
    ["cafe", "coffee", "bakery", "pasteleria", "pastelaria", "panaderia"],
  ],
  ["bar", ["bar", "pub", "cantina", "brewery", "cerveceria", "mezcaleria"]],
  [
    "restaurant",
    [
      "restaurant",
      "restaurante",
      "taqueria",
      "taco",
      "pizzeria",
      "pizza",
      "ramen",
      "sushi",
      "bistro",
      "grill",
      "kitchen",
      "cocina",
      "comedor",
      "food",
      "mercado",
      "market",
      "quesadilla",
      "empanada",
    ],
  ],
  ["hotel", ["hotel", "hostel", "hostal", "inn", "resort", "lodge", "posada"]],
  ["viewpoint", ["mirador", "miradouro", "viewpoint", "lookout", "overlook"]],
  [
    "activity",
    [
      "museum",
      "museo",
      "park",
      "parque",
      "tour",
      "beach",
      "playa",
      "cenote",
      "trail",
      "hike",
      "ruins",
      "temple",
      "gallery",
      "waterfall",
      "cascada",
    ],
  ],
  ["shop", ["shop", "store", "tienda", "boutique", "bookstore", "livraria"]],
];

/** Rough category from words in the name; "other" when nothing matches. */
export function guessCategory(name: string): PlaceCategory {
  const words = new Set(
    normaliseName(name)
      .split(" ")
      .flatMap((w) => [w, w.replace(/s$/, "")]),
  );
  for (const [category, list] of CATEGORY_WORDS) {
    if (list.some((w) => words.has(w))) return category;
  }
  return "other";
}
