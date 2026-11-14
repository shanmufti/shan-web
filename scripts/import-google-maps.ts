/**
 * Import Google Maps saved lists (Google Takeout) into `destinations` and
 * `places`. Places show on the journeys their destination links to. See
 * README → "Places from Google Maps".
 *
 *   NODE_ENV=production npx payload run scripts/import-google-maps.ts <takeout-folder> [options]
 *
 * <takeout-folder> is the unzipped Takeout folder (or just its "Saved"
 * folder). Every *.csv under it is one saved list, named after the file; a
 * GeoJSON *.json (e.g. "Saved Places.json", your starred places) is read too.
 *
 * It's a dry run unless you add `apply`. Options are plain words because
 * `payload run` drops anything starting with "--" (lib/script-args.ts):
 *   apply                Write to the database. Without it: dry run, which
 *                        prints the summary and writes only the review file.
 *   no-db                Dry run without connecting to the database at all.
 *   map=<file.json>      List name → destination slug | {slug,title,country}
 *                        | "review" | "skip". Unmapped lists become a
 *                        destination named after the list, except catch-all
 *                        lists (Want to go, Favourites, Starred places…).
 *   review-out=<file>    Where to write the review CSV for catch-all places
 *                        (default: <takeout-folder>/google-maps-review.csv).
 *   assign=<file.csv>    A review CSV with its `destination` column filled in:
 *                        those places are imported to the named destinations.
 *   visibility=<v>       Visibility for new places: public (default),
 *                        private or owner.
 *
 * Re-runs are safe: destinations match by slug or source list name, places by
 * `importKey` (Google place id, else name + coordinates). Existing places get
 * their import fields refreshed; your edits to category, note (once set) and
 * visibility are kept. Nothing is ever deleted.
 *
 * The export holds personal data: keep it outside the repo. NODE_ENV=production
 * stops Payload from pushing the dev schema on connect; start `next dev` once
 * (or run migrations) first so the tables exist.
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Payload } from "payload";

import {
  destinationChanges,
  newPlace,
  placeChanges,
} from "../lib/google-maps-sync";
import {
  emptyTakeout,
  planImport,
  readAssignments,
  readListCsv,
  readSavedPlacesJson,
  reviewCsv,
  type ExistingDestination,
  type DestinationPlan,
  type ImportPlan,
  type ListMapping,
  type SavedPlace,
  type TakeoutData,
} from "../lib/google-maps-takeout";
import { parseScriptArgs } from "../lib/script-args";
import type { Place } from "../payload-types";

type Visibility = "public" | "private" | "owner";

interface Options {
  folder: string;
  dryRun: boolean;
  noDb: boolean;
  mapFile: string | null;
  assignFile: string | null;
  reviewOut: string;
  visibility: Visibility;
}

const log = (line = "") => process.stdout.write(`${line}\n`);

function parseArgs(argv: string[]): Options {
  const args = parseScriptArgs(argv, {
    switches: ["apply", "dry-run", "no-db"],
    values: ["map", "assign", "review-out", "visibility"],
  });
  const folderArg = args.positionals[0];
  if (!folderArg || args.positionals.length > 1) {
    throw new Error(
      "Usage: npx payload run scripts/import-google-maps.ts <takeout-folder> [apply] [map=file.json] [assign=review.csv]",
    );
  }
  const folder = path.resolve(folderArg);
  const visibility = args.values.get("visibility") ?? "public";
  if (
    visibility !== "public" &&
    visibility !== "private" &&
    visibility !== "owner"
  ) {
    throw new Error("visibility must be public, private or owner");
  }
  const dryRun = !args.switches.has("apply") || args.switches.has("dry-run");
  const noDb = args.switches.has("no-db");
  if (noDb && !dryRun) throw new Error("no-db can't be combined with apply");
  const file = (name: string) => {
    const value = args.values.get(name);
    return value ? path.resolve(value) : null;
  };
  return {
    folder,
    dryRun,
    noDb,
    mapFile: file("map"),
    assignFile: file("assign"),
    reviewOut:
      file("review-out") ?? path.join(folder, "google-maps-review.csv"),
    visibility,
  };
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

async function readTakeout(folder: string): Promise<TakeoutData> {
  if (!(await stat(folder)).isDirectory()) {
    throw new Error(`${folder} is not a folder`);
  }
  const data = emptyTakeout();
  for (const file of await walk(folder)) {
    const ext = path.extname(file).toLowerCase();
    const name = path.basename(file, path.extname(file));
    if (name === "google-maps-review") continue;
    if (ext === ".csv") {
      readListCsv(data, name, await readFile(file, "utf8"));
    } else if (ext === ".json" || ext === ".geojson") {
      const text = await readFile(file, "utf8");
      if (text.includes('"FeatureCollection"')) {
        readSavedPlacesJson(data, name, text);
      }
    }
  }
  return data;
}

function listTarget(plan: ImportPlan, name: string): string {
  const dest = plan.destinations.find((d) => d.lists.includes(name));
  if (dest) return `→ ${dest.slug}`;
  if (plan.skippedLists.includes(name)) return "→ skipped";
  return "→ review file (catch-all)";
}

function printReview(plan: ImportPlan) {
  if (plan.review.length === 0) return;
  log();
  log(`Catch-all places for review: ${String(plan.review.length)}`);
  for (const row of plan.review.slice(0, 10)) {
    const hint = row.suggested
      ? `nearest ${row.suggested} (${row.distanceKm} km, ${row.confidence})`
      : "no suggestion";
    log(`  ${row.name} [${row.list}]: ${hint}`);
  }
  if (plan.review.length > 10) {
    log(`  … ${String(plan.review.length - 10)} more in the review file`);
  }
}

function printPlan(data: TakeoutData, plan: ImportPlan) {
  const withCoords = [...data.places.values()].filter((p) => p.coordinates);
  log(
    `Read ${String(data.lists.length)} lists, ${String(data.places.size)} unique places (${String(withCoords.length)} with coordinates).`,
  );
  log();
  log("Lists:");
  for (const list of data.lists) {
    const described = list.description ? ", has description" : "";
    log(
      `  ${list.name} (${String(list.placeKeys.length)} places${described}) ${listTarget(plan, list.name)}`,
    );
  }
  log();
  log("Destinations:");
  for (const d of plan.destinations) {
    const where = d.centroid
      ? `${String(d.centroid.lat)}, ${String(d.centroid.lng)}`
      : "no coordinates";
    log(
      `  ${d.existingId == null ? "create" : "update"} ${d.slug} "${d.title}": ${String(d.placeKeys.length)} places, centre ${where}`,
    );
  }
  printReview(plan);
  for (const w of [...data.warnings, ...plan.warnings]) log(`! ${w}`);
}

// ---------------------------------------------------------------------------
// Database

async function connect(): Promise<Payload> {
  const [{ getPayload }, { default: config }] = await Promise.all([
    import("payload"),
    import("@payload-config"),
  ]);
  return getPayload({ config });
}

async function existingDestinations(
  payload: Payload,
): Promise<ExistingDestination[]> {
  const { docs } = await payload.find({
    collection: "destinations",
    limit: 1000,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  return docs.map((d) => ({
    id: d.id,
    slug: d.slug,
    title: d.title,
    sourceLists: d.sourceLists ?? [],
    coordinates:
      d.coordinates?.lat != null && d.coordinates.lng != null
        ? { lat: d.coordinates.lat, lng: d.coordinates.lng }
        : null,
  }));
}

interface Counts {
  created: number;
  updated: number;
  unchanged: number;
}

const counts = (): Counts => ({ created: 0, updated: 0, unchanged: 0 });

async function createDestination(payload: Payload, dest: DestinationPlan) {
  const created = await payload.create({
    collection: "destinations",
    overrideAccess: true,
    data: {
      title: dest.title,
      slug: dest.slug,
      draft: true,
      visibility: "public",
      sourceLists: dest.lists,
      ...(dest.country ? { country: dest.country } : {}),
      ...(dest.centroid ? { coordinates: dest.centroid } : {}),
      ...(dest.description ? { importedNotes: dest.description } : {}),
    },
  });
  return created.id;
}

async function syncDestinations(
  payload: Payload,
  plan: ImportPlan,
  dryRun: boolean,
): Promise<{ ids: Map<string, number | string>; result: Counts }> {
  const ids = new Map<string, number | string>();
  const result = counts();
  for (const dest of plan.destinations) {
    if (dest.existingId == null) {
      result.created++;
      ids.set(
        dest.slug,
        dryRun ? `new:${dest.slug}` : await createDestination(payload, dest),
      );
      continue;
    }
    ids.set(dest.slug, dest.existingId);
    const current = await payload.findByID({
      collection: "destinations",
      id: dest.existingId,
      depth: 0,
      overrideAccess: true,
    });
    const data = destinationChanges(current, dest);
    if (!data) {
      result.unchanged++;
      continue;
    }
    result.updated++;
    if (!dryRun) {
      await payload.update({
        collection: "destinations",
        id: dest.existingId,
        overrideAccess: true,
        data,
      });
    }
  }
  return { ids, result };
}

async function placesByKey(payload: Payload, keys: string[]) {
  const existing = new Map<string, Place>();
  for (let i = 0; i < keys.length; i += 200) {
    const { docs } = await payload.find({
      collection: "places",
      where: { importKey: { in: keys.slice(i, i + 200) } },
      limit: 200,
      depth: 0,
      overrideAccess: true,
    });
    for (const doc of docs) if (doc.importKey) existing.set(doc.importKey, doc);
  }
  return existing;
}

async function syncPlace(
  payload: Payload,
  place: SavedPlace,
  current: Place | undefined,
  destinationId: number | string,
  opts: Options,
): Promise<keyof Counts> {
  if (!current) {
    if (!opts.dryRun) {
      await payload.create({
        collection: "places",
        overrideAccess: true,
        data: newPlace(place, Number(destinationId), opts.visibility),
      });
    }
    return "created";
  }
  const update = placeChanges(current, place, destinationId);
  if (!update) return "unchanged";
  if (!opts.dryRun) {
    await payload.update({
      collection: "places",
      id: current.id,
      overrideAccess: true,
      data: update,
    });
  }
  return "updated";
}

async function syncPlaces(
  payload: Payload,
  data: TakeoutData,
  plan: ImportPlan,
  destinationIds: Map<string, number | string>,
  opts: Options,
): Promise<Counts> {
  const result = counts();
  const existing = await placesByKey(payload, [...plan.assignments.keys()]);
  for (const [key, slug] of plan.assignments) {
    const place = data.places.get(key);
    const destinationId = destinationIds.get(slug);
    if (!place || destinationId == null) continue;
    const outcome = await syncPlace(
      payload,
      place,
      existing.get(key),
      destinationId,
      opts,
    );
    result[outcome]++;
  }
  return result;
}

async function writeReview(plan: ImportPlan, file: string) {
  if (plan.review.length === 0) return;
  await writeFile(file, reviewCsv(plan), "utf8");
  log();
  log(`Review file: ${file}`);
  log(
    '  Fill the destination column with a slug or "skip", then re-run with assign=<file>.',
  );
}

async function sync(
  payload: Payload,
  data: TakeoutData,
  plan: ImportPlan,
  opts: Options,
) {
  const { ids, result: destCounts } = await syncDestinations(
    payload,
    plan,
    opts.dryRun,
  );
  const placeCounts = await syncPlaces(payload, data, plan, ids, opts);
  const label = (noun: string) => (opts.dryRun ? `${noun} (would be)` : noun);
  const line = (c: Counts) =>
    `${String(c.created)} created, ${String(c.updated)} updated, ${String(c.unchanged)} unchanged.`;
  log();
  log(`${label("Destinations")}: ${line(destCounts)}`);
  log(`${label("Places")}: ${line(placeCounts)}`);
  if (!opts.dryRun && destCounts.created > 0) {
    log(
      "New destinations: link each to its journeys in /admin → Destinations; their places then show on those journey pages.",
    );
  }
}

async function readOptional(file: string | null): Promise<string | null> {
  return file ? readFile(file, "utf8") : null;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  log(
    opts.dryRun
      ? "DRY RUN: nothing is written to the database. Add `apply` to write."
      : "APPLY: writing to the database in DATABASE_URL.",
  );
  log(`Export: ${opts.folder}`);
  log();

  const data = await readTakeout(opts.folder);
  const mapText = await readOptional(opts.mapFile);
  const assignText = await readOptional(opts.assignFile);
  const payload = opts.noDb ? null : await connect();
  const plan = planImport(data, {
    mapping: mapText ? (JSON.parse(mapText) as ListMapping) : {},
    existing: payload ? await existingDestinations(payload) : [],
    ...(assignText ? { assigned: readAssignments(assignText) } : {}),
  });
  printPlan(data, plan);
  await writeReview(plan, opts.reviewOut);
  if (payload) await sync(payload, data, plan, opts);
}

try {
  await main();
  process.exit(0);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
}
