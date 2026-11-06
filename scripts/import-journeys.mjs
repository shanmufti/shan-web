/**
 * One-time import of journeys and visited countries from a local seed file.
 *
 * The seed file holds personal travel data, so it lives in docs/ (gitignored),
 * never in the repo. Default seed: docs/seed/journeys.json.
 *
 * Always run with NODE_ENV=production. Otherwise Payload pushes the local
 * dev schema to the database on connect, before this script runs.
 *
 * Dry run (default, writes nothing):
 *   NODE_ENV=production npx payload run scripts/import-journeys.mjs
 * Write to the database in DATABASE_URL:
 *   NODE_ENV=production npx payload run scripts/import-journeys.mjs apply
 * Custom seed path:
 *   NODE_ENV=production npx payload run scripts/import-journeys.mjs apply path/to/seed.json
 *
 * Behaviour:
 * - Journeys are created as drafts, so nothing goes public until you review
 *   and publish each one in /admin.
 * - A journey whose slug already exists is skipped, never overwritten.
 * - Visited countries: years from journey stops plus `visitedCountriesExtra`
 *   are merged into existing rows (years are only added, never removed).
 * - The `timeline` array is not imported (no collection for it yet).
 */
import config from "@payload-config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPayload } from "payload";

const args = process.argv.slice(2);
const apply = args.includes("apply");
const seedPath = path.resolve(
  args.find((a) => a.endsWith(".json")) ?? "docs/seed/journeys.json",
);

const seed = JSON.parse(await readFile(seedPath, "utf8"));
const payload = await getPayload({ config });

const log = (...parts) => process.stdout.write(parts.join(" ") + "\n");
log(
  apply
    ? "APPLY mode: writing to the database."
    : "DRY RUN: nothing is written. Add `apply` to write.",
);
log(`Seed: ${seedPath}\n`);

/** Minimal Lexical document with one paragraph (body is a required field). */
function lexicalParagraph(text) {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: null,
      children: [
        {
          type: "paragraph",
          format: "",
          indent: 0,
          version: 1,
          direction: null,
          textFormat: 0,
          textStyle: "",
          children: [
            {
              type: "text",
              text,
              format: 0,
              style: "",
              mode: "normal",
              detail: 0,
              version: 1,
            },
          ],
        },
      ],
    },
  };
}

/** Drop `_notes`-style keys before sending data to Payload. */
function stripNotes(value) {
  if (Array.isArray(value)) return value.map(stripNotes);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !k.startsWith("_"))
        .map(([k, v]) => [k, stripNotes(v)]),
    );
  }
  return value;
}

// --- Journeys --------------------------------------------------------------

const years = new Map(); // ISO3 -> Set<number>
const addYear = (code, year) => {
  if (!code || !year) return;
  const key = code.toUpperCase();
  if (!years.has(key)) years.set(key, new Set());
  years.get(key).add(year);
};

let created = 0;
let skipped = 0;
for (const raw of seed.journeys ?? []) {
  const j = stripNotes(raw);
  const startYear = Number(j.startDate.slice(0, 4));
  for (const stop of j.stops ?? []) {
    addYear(
      stop.countryCode,
      stop.arrivedOn ? Number(stop.arrivedOn.slice(0, 4)) : startYear,
    );
  }

  const existing = await payload.find({
    collection: "travel",
    where: { slug: { equals: j.slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (existing.docs.length > 0) {
    log(`skip    ${j.slug} (already exists)`);
    skipped++;
    continue;
  }

  const data = {
    title: j.title,
    slug: j.slug,
    date: j.startDate,
    startDate: j.startDate,
    ...(j.endDate ? { endDate: j.endDate } : {}),
    summary: j.summary,
    tags: j.tags ?? [],
    body: lexicalParagraph(j.summary),
    draft: true,
    featured: false,
    visibility: "public",
    location: j.location,
    stops: (j.stops ?? []).map((s) => ({
      name: s.name,
      countryCode: s.countryCode,
      lat: s.lat,
      lng: s.lng,
      ...(s.arrivedOn ? { arrivedOn: s.arrivedOn } : {}),
    })),
  };

  if (apply) {
    await payload.create({ collection: "travel", data, overrideAccess: true });
  }
  log(
    `${apply ? "create" : "would create"}  ${j.slug}  (${data.stops.length} stops, draft)`,
  );
  created++;
}

// --- Visited countries -----------------------------------------------------

for (const [code, list] of Object.entries(seed.visitedCountriesExtra ?? {})) {
  if (code.startsWith("_") || !Array.isArray(list)) continue;
  for (const y of list) addYear(code, y);
}

log("");
for (const [country, set] of [...years.entries()].sort()) {
  const seedYears = [...set].sort();
  const found = await payload.find({
    collection: "visited-countries",
    where: { country: { equals: country } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const row = found.docs[0];
  if (row) {
    const current = row.yearsVisited ?? [];
    const merged = [...new Set([...current, ...seedYears])].sort();
    if (merged.length === current.length) {
      log(`country ${country}: up to date`);
      continue;
    }
    if (apply) {
      await payload.update({
        collection: "visited-countries",
        id: row.id,
        data: { yearsVisited: merged },
        overrideAccess: true,
      });
    }
    log(
      `country ${country}: ${apply ? "updated" : "would update"} years -> ${merged.join(", ")}`,
    );
  } else {
    if (apply) {
      await payload.create({
        collection: "visited-countries",
        data: { country, yearsVisited: seedYears },
        overrideAccess: true,
      });
    }
    log(
      `country ${country}: ${apply ? "created" : "would create"} with ${seedYears.join(", ")}`,
    );
  }
}

log(
  `\nJourneys: ${created} ${apply ? "created" : "to create"}, ${skipped} skipped.`,
);
log(
  `Timeline entries in seed (not imported): ${(seed.timeline ?? []).length}.`,
);
