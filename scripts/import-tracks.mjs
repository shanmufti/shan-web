/**
 * Adds GPS route lines to journeys from a Polarsteps export.
 *
 * Input: docs/seed/polarsteps-points.json (gitignored, personal data),
 * shaped { points: [[unixSeconds, lat, lng], ...] }.
 *
 * For every journey with a start and end date, takes the points inside that
 * date range, splits them where the line jumps (flights, lost signal), drops
 * segments far from all of the journey's stops (airport transfers at either
 * end), simplifies each segment and rounds to 3 decimals (about 100 m).
 *
 * Home bases stay off the map: any ~2 km cell where the GPS spent several
 * days outside every journey's dates (a home base) is
 * masked with a 2-cell margin (about 10 km across), and the line breaks there.
 *
 * Always run with NODE_ENV=production so Payload does not push the local dev
 * schema to the database on connect. The `track` column must already exist
 * (it arrives with the normal schema push from `next dev`).
 *
 * Dry run (default, writes nothing):
 *   NODE_ENV=production npx payload run scripts/import-tracks.mjs
 * Write tracks:
 *   NODE_ENV=production npx payload run scripts/import-tracks.mjs apply
 * Add `dump` to also write docs/seed/tracks-preview.json for checking.
 * Replace tracks that are already set:
 *   NODE_ENV=production npx payload run scripts/import-tracks.mjs apply overwrite
 */
import config from "@payload-config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getPayload } from "payload";

if (process.env.NODE_ENV !== "production") {
  process.stderr.write(
    "Refusing to run: set NODE_ENV=production so Payload skips its dev schema push.\n",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes("apply");
const dump = args.includes("dump"); // also write docs/seed/tracks-preview.json
const overwrite = args.includes("overwrite");
const pointsPath = path.resolve(
  args.find((a) => a.endsWith(".json")) ?? "docs/seed/polarsteps-points.json",
);

const JUMP_KM = 100; // a longer hop between two points starts a new segment
const STOP_RADIUS_KM = 150; // segments farther than this from every stop are dropped
const MAX_POINTS = 1200; // per journey, after simplification
const PAD_MS = 12 * 3600 * 1000; // dates are local, points are UTC
const CELL_DEG = 0.02; // home-mask grid, about 2 km
const HOME_DAYS = 4; // days outside any journey before a cell counts as home

const log = (...parts) => process.stdout.write(parts.join(" ") + "\n");

/** @type {[number, number, number][]} */
const points = JSON.parse(await readFile(pointsPath, "utf8")).points;

function km(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Iterative Douglas-Peucker on [lat, lng] pairs; epsilon in degrees. */
function simplify(line, epsilon) {
  if (line.length < 3) return line;
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack = [[0, line.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop();
    const [ay, ax] = line[first];
    const [by, bx] = line[last];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-12;
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const [py, px] = line[i];
      const dist = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (index !== -1 && maxDist > epsilon) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

const cellKey = (lat, lng, dy = 0, dx = 0) =>
  `${String(Math.floor(lat / CELL_DEG) + dy)}:${String(Math.floor(lng / CELL_DEG) + dx)}`;

function journeyWindow(journey) {
  const start = Date.parse(journey.startDate.slice(0, 10)) - PAD_MS;
  const last = journey.endDate ?? journey.startDate;
  const end = Date.parse(last.slice(0, 10)) + 24 * 3600 * 1000 + PAD_MS;
  return [start, end];
}

/** Cells (plus neighbours) where the GPS sat for days between journeys. */
function homeMask(journeys) {
  const windows = journeys.map(journeyWindow);
  const days = new Map();
  for (const [t, lat, lng] of points) {
    const ms = t * 1000;
    if (windows.some(([a, b]) => ms >= a && ms <= b)) continue;
    const key = cellKey(lat, lng);
    if (!days.has(key)) days.set(key, new Set());
    days.get(key).add(Math.floor(ms / 86_400_000));
  }
  const mask = new Set();
  for (const [key, set] of days) {
    if (set.size < HOME_DAYS) continue;
    const [y, x] = key.split(":").map(Number);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        mask.add(`${String(y + dy)}:${String(x + dx)}`);
      }
    }
  }
  return mask;
}

let home = new Set();

function buildTrack(journey) {
  const [start, end] = journeyWindow(journey);
  const stops = (journey.stops ?? []).map((s) => [s.lat, s.lng]);
  if (journey.location?.lat != null && journey.location?.lng != null) {
    stops.push([journey.location.lat, journey.location.lng]);
  }

  const segments = [];
  let current = [];
  for (const [t, lat, lng] of points) {
    const ms = t * 1000;
    if (ms < start) continue;
    if (ms > end) break;
    if (home.has(cellKey(lat, lng))) {
      if (current.length > 0) segments.push(current);
      current = [];
      continue;
    }
    const p = [lat, lng];
    const prev = current.at(-1);
    if (prev && km(prev, p) > JUMP_KM) {
      segments.push(current);
      current = [];
    }
    current.push(p);
  }
  segments.push(current);

  // Trim transfers at either end (airports, the drive from home) that never
  // come near a stop; legs in the middle of the trip all stay.
  const near = (seg) =>
    stops.length === 0 ||
    seg.some((p) => stops.some((s) => km(p, s) <= STOP_RADIUS_KM));
  let kept = segments.filter((seg) => seg.length > 1);
  while (kept.length > 0 && !near(kept[0])) kept = kept.slice(1);
  while (kept.length > 0 && !near(kept.at(-1))) kept = kept.slice(0, -1);

  let epsilon = 0.0005;
  let out = kept.map((seg) => simplify(seg, epsilon));
  while (out.reduce((n, seg) => n + seg.length, 0) > MAX_POINTS) {
    epsilon *= 2;
    out = kept.map((seg) => simplify(seg, epsilon));
  }
  const round = (v) => Math.round(v * 1000) / 1000;
  return out
    .map((seg) =>
      seg
        .map(([lat, lng]) => [round(lat), round(lng)])
        .filter(
          (p, i, arr) =>
            i === 0 || p[0] !== arr[i - 1][0] || p[1] !== arr[i - 1][1],
        ),
    )
    .filter((seg) => seg.length > 1);
}

const payload = await getPayload({ config });
log(
  apply
    ? "APPLY mode: writing tracks."
    : "DRY RUN: nothing is written. Add `apply` to write.",
);
log(`Points: ${String(points.length)} from ${pointsPath}\n`);

const { docs } = await payload.find({
  collection: "travel",
  limit: 1000,
  depth: 0,
  sort: "startDate",
  overrideAccess: true,
  // Only these columns, so a dry run works before `track` exists in the DB.
  select: {
    slug: true,
    startDate: true,
    endDate: true,
    location: true,
    stops: true,
  },
});

home = homeMask(docs);
log(`Home cells masked: ${String(home.size)}\n`);

let written = 0;
const preview = {};
for (const journey of docs) {
  if (!journey.endDate) {
    log(`skip    ${journey.slug} (no end date)`);
    continue;
  }
  const track = buildTrack(journey);
  const count = track.reduce((n, seg) => n + seg.length, 0);
  if (count === 0) {
    log(`none    ${journey.slug} (no GPS points in range)`);
    continue;
  }
  preview[journey.slug] = { stops: journey.stops ?? [], track };
  if (apply) {
    if (!overwrite) {
      const existing = await payload.findByID({
        collection: "travel",
        id: journey.id,
        depth: 0,
        overrideAccess: true,
        select: { track: true },
      });
      if (Array.isArray(existing.track) && existing.track.length > 0) {
        log(`keep    ${journey.slug} (already has a track)`);
        continue;
      }
    }
    await payload.update({
      collection: "travel",
      id: journey.id,
      data: { track },
      overrideAccess: true,
    });
  }
  log(
    `${apply ? "write" : "would write"}  ${journey.slug}  (${String(track.length)} segments, ${String(count)} points)`,
  );
  written++;
}

if (dump) {
  await writeFile(
    path.resolve("docs/seed/tracks-preview.json"),
    JSON.stringify(preview),
  );
}
log(`\nTracks: ${String(written)} ${apply ? "written" : "to write"}.`);
