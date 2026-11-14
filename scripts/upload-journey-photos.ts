/**
 * Upload photos to `media` (R2) and attach them to journeys.
 *
 *   NODE_ENV=production npx payload run scripts/upload-journey-photos.ts <manifest.json> [apply]
 *
 * <manifest.json> is a JSON array, one entry per photo, in display order:
 *   {
 *     "journey": "mexico-city-and-sayulita",  // travel slug
 *     "file": "exports/mx/IMG_1234.jpg",      // relative to the manifest
 *     "alt": "Pink jacaranda over Roma Norte", // optional, file name if blank
 *     "caption": "…",                          // optional
 *     "takenAt": "2024-03-02",                 // optional, else from EXIF
 *     "lat": 19.4194, "lng": -99.1617,         // optional, else from EXIF GPS
 *     "place": "Roma Norte",                   // optional
 *     "stop": "Mexico City",                   // optional, a stops[].name
 *     "cover": true                            // optional, sets journey cover
 *   }
 *
 * Export JPEG (not HEIC) from Photos, keeping its metadata. Any size is
 * fine: Payload copies GPS and capture time into private fields
 * (lib/photo-exif.ts), then stores the original at most 2560px with all
 * EXIF removed, plus WebP sizes (collections/Media.ts).
 *
 * Dry run unless you add `apply` (`payload run` drops "--" flags). Options:
 *   apply      Upload and write to the database in DATABASE_URL.
 *   replace    Replace each journey's existing photos instead of appending.
 *
 * Re-runs are safe: uploaded files are recorded in <manifest>.uploaded.json
 * (file → media id) and not uploaded again. Needs R2_* env vars, or files
 * land on local disk instead of R2.
 */
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Payload } from "payload";

import { parseScriptArgs } from "../lib/script-args";

interface Entry {
  journey: string;
  file: string;
  alt?: string;
  caption?: string;
  takenAt?: string;
  lat?: number;
  lng?: number;
  place?: string;
  stop?: string;
  cover?: boolean;
}

const log = (line = "") => process.stdout.write(`${line}\n`);
const HEIC = /\.(heic|heif)$/i;

function readEntries(text: string): Entry[] {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("Manifest must be a JSON array");
  return parsed.map((raw, i) => {
    const e = raw as Partial<Entry>;
    if (typeof e.journey !== "string" || typeof e.file !== "string") {
      throw new Error(`Entry ${i}: "journey" and "file" are required`);
    }
    if (HEIC.test(e.file)) {
      throw new Error(`Entry ${i}: ${e.file} is HEIC; export JPEG instead`);
    }
    return e as Entry;
  });
}

/** Private location fields; GPS in the file's EXIF fills any gaps. */
function locationOf(e: Entry) {
  const hasCoords = typeof e.lat === "number" && typeof e.lng === "number";
  if (!hasCoords && !e.place) return {};
  return {
    location: {
      ...(hasCoords ? { lat: e.lat, lng: e.lng } : {}),
      ...(e.place ? { place: e.place } : {}),
    },
  };
}

async function connect(): Promise<Payload> {
  const [{ getPayload }, { default: config }] = await Promise.all([
    import("payload"),
    import("@payload-config"),
  ]);
  return getPayload({ config });
}

async function readState(file: string): Promise<Record<string, number>> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as Record<string, number>;
  } catch {
    return {};
  }
}

interface Options {
  apply: boolean;
  replace: boolean;
  baseDir: string;
  stateFile: string;
  state: Record<string, number>;
}

type Journey = Awaited<ReturnType<typeof findJourney>>;

async function findJourney(payload: Payload, slug: string) {
  const { docs } = await payload.find({
    collection: "travel",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return docs[0];
}

function describe(journey: NonNullable<Journey>, list: Entry[], opts: Options) {
  const stopNames = new Set((journey.stops ?? []).map((s) => s.name));
  const unknown = [
    ...new Set(
      list.flatMap((e) => (e.stop && !stopNames.has(e.stop) ? [e.stop] : [])),
    ),
  ];
  const pending = list.filter((e) => !opts.state[e.file]).length;
  const warning =
    unknown.length > 0 ? `, stops not on the route: ${unknown.join(", ")}` : "";
  return `  ${journey.slug}: ${list.length} photos (${pending} to upload)${warning}`;
}

/** Uploads the entry's file once; returns its media id. */
async function uploadOnce(payload: Payload, e: Entry, opts: Options) {
  const known = opts.state[e.file];
  if (known) return known;
  const created = await payload.create({
    collection: "media",
    filePath: path.resolve(opts.baseDir, e.file),
    data: {
      alt: e.alt ?? "",
      ...(e.caption ? { caption: e.caption } : {}),
      ...(e.takenAt ? { takenAt: e.takenAt } : {}),
      ...locationOf(e),
    },
    overrideAccess: true,
  });
  opts.state[e.file] = created.id;
  await writeFile(opts.stateFile, `${JSON.stringify(opts.state, null, 2)}\n`);
  log(`    ↑ ${e.file} → media ${created.id}`);
  return created.id;
}

async function attach(
  payload: Payload,
  journey: NonNullable<Journey>,
  list: Entry[],
  opts: Options,
) {
  const rows: { image: number; stop: string | null }[] = [];
  let cover: number | undefined;
  for (const e of list) {
    const id = await uploadOnce(payload, e, opts);
    rows.push({ image: id, stop: e.stop ?? null });
    if (e.cover) cover = id;
  }
  const existing = opts.replace
    ? []
    : (journey.photos ?? []).map((p) => ({
        image: (typeof p.image === "object" ? p.image?.id : p.image) ?? null,
        stop: p.stop ?? null,
      }));
  const have = new Set(existing.map((p) => p.image));
  const added = rows.filter((p) => !have.has(p.image));
  await payload.update({
    collection: "travel",
    id: journey.id,
    data: { photos: [...existing, ...added], ...(cover ? { cover } : {}) },
    overrideAccess: true,
  });
  log(
    `    ✓ ${journey.slug}: ${added.length} added${cover ? ", cover set" : ""}`,
  );
}

async function main() {
  const args = parseScriptArgs(process.argv.slice(2), {
    switches: ["apply", "replace"],
    values: [],
  });
  const manifest = args.positionals[0];
  if (!manifest) {
    throw new Error(
      "Usage: npx payload run scripts/upload-journey-photos.ts <manifest.json> [apply] [replace]",
    );
  }
  const stateFile = `${manifest.replace(/\.json$/, "")}.uploaded.json`;
  const opts: Options = {
    apply: args.switches.has("apply"),
    replace: args.switches.has("replace"),
    baseDir: path.dirname(path.resolve(manifest)),
    stateFile,
    state: await readState(stateFile),
  };
  const entries = readEntries(await readFile(manifest, "utf8"));
  for (const e of entries) await access(path.resolve(opts.baseDir, e.file));

  const byJourney = new Map<string, Entry[]>();
  for (const e of entries) {
    byJourney.set(e.journey, [...(byJourney.get(e.journey) ?? []), e]);
  }
  const mode = opts.apply ? "APPLY" : "DRY RUN (add `apply` to write)";
  const replacing = opts.replace ? ", replacing existing galleries" : "";
  log(
    `${mode}: ${entries.length} photos for ${byJourney.size} journeys${replacing}`,
  );

  const payload = await connect();
  for (const [slug, list] of byJourney) {
    const journey = await findJourney(payload, slug);
    if (!journey) {
      log(`  ✗ ${slug}: no journey with this slug, skipped`);
      continue;
    }
    log(describe(journey, list, opts));
    if (opts.apply) await attach(payload, journey, list, opts);
  }
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
