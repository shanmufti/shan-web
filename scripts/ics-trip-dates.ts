/**
 * Suggest `datesVisited` for destinations from a calendar export (.ics), e.g.
 * an iCloud "Travel" calendar exported from Calendar.app (File → Export).
 *
 *   NODE_ENV=production npx payload run scripts/ics-trip-dates.ts <file.ics> [apply]
 *   npx tsx scripts/ics-trip-dates.ts <file.ics> no-db destinations="Oaxaca,Lisbon"
 *
 * Options are plain words because `payload run` drops "--" flags.
 *
 * Events match a destination when its title (or slug, or a source list name)
 * appears as whole words in the event title or location. Flights, buses,
 * hotel bookings and similar are ignored; overlapping or back-to-back events
 * merge into one stay. Events that match nothing are listed so trips without
 * a destination still show up.
 *
 * Without `apply` nothing is written. With it, each suggested stay is
 * added to the destination's datesVisited unless a stay with the same start
 * date is already there. Keep the .ics outside the repo: it's personal.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseScriptArgs } from "../lib/script-args";
import { formatSlug } from "../lib/slug";
import type { Payload } from "payload";

import {
  parseIcs,
  suggestTripDates,
  type CalendarEvent,
  type DestinationName,
  type TripSuggestion,
} from "../lib/ics-trips";

const log = (line = "") => process.stdout.write(`${line}\n`);

interface Target {
  id: number;
  slug: string;
}

async function loadDestinations(
  payload: Payload,
): Promise<{ names: DestinationName[]; targets: Target[] }> {
  const { docs } = await payload.find({
    collection: "destinations",
    limit: 1000,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  return {
    names: docs.map((d) => ({
      slug: d.slug,
      names: [d.title, d.slug.replaceAll("-", " "), ...(d.sourceLists ?? [])],
    })),
    targets: docs.map((d) => ({ id: d.id, slug: d.slug })),
  };
}

function printSuggestions(
  suggestions: TripSuggestion[],
  unmatched: CalendarEvent[],
) {
  log();
  for (const s of suggestions) {
    log(`${s.slug}:`);
    for (const r of s.ranges) {
      log(`  ${r.from} to ${r.to}  (${r.events.join("; ")})`);
    }
  }
  if (unmatched.length > 0) {
    log();
    log("No matching destination:");
    for (const e of unmatched) log(`  ${e.start} to ${e.end}  ${e.summary}`);
  }
}

/** Adds stays whose start date isn't on the destination yet. */
async function applySuggestions(
  payload: Payload,
  suggestions: TripSuggestion[],
  targets: Target[],
) {
  let added = 0;
  for (const s of suggestions) {
    const id = targets.find((t) => t.slug === s.slug)?.id;
    if (id == null) continue;
    const doc = await payload.findByID({
      collection: "destinations",
      id,
      depth: 0,
      overrideAccess: true,
    });
    const current = doc.datesVisited ?? [];
    const starts = new Set(current.map((d) => d.from.slice(0, 10)));
    const fresh = s.ranges.filter((r) => !starts.has(r.from));
    if (fresh.length === 0) continue;
    added += fresh.length;
    await payload.update({
      collection: "destinations",
      id,
      overrideAccess: true,
      data: {
        datesVisited: [
          ...current.map((d) => ({
            from: d.from,
            to: d.to ?? null,
            note: d.note ?? null,
          })),
          ...fresh.map((r) => ({ from: r.from, to: r.to })),
        ].sort((a, b) => a.from.localeCompare(b.from)),
      },
    });
  }
  log();
  log(`Added ${String(added)} stays.`);
}

async function main() {
  const args = parseScriptArgs(process.argv.slice(2), {
    switches: ["apply", "no-db"],
    values: ["destinations"],
  });
  const file = args.positionals.find((a) => a.endsWith(".ics"));
  if (!file) {
    throw new Error(
      "Usage: npx payload run scripts/ics-trip-dates.ts <file.ics> [apply]",
    );
  }
  const apply = args.switches.has("apply");
  const noDb = args.switches.has("no-db");
  if (apply && noDb) throw new Error("apply needs the database");

  const events = parseIcs(await readFile(path.resolve(file), "utf8"));
  log(`Read ${String(events.length)} events from ${path.resolve(file)}`);

  if (noDb) {
    const names = (args.values.get("destinations") ?? "")
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => ({ slug: formatSlug(n), names: [n] }));
    const { suggestions, unmatched } = suggestTripDates(events, names);
    printSuggestions(suggestions, unmatched);
    return;
  }

  const [{ getPayload }, { default: config }] = await Promise.all([
    import("payload"),
    import("@payload-config"),
  ]);
  const payload = await getPayload({ config });
  const { names, targets } = await loadDestinations(payload);
  const { suggestions, unmatched } = suggestTripDates(events, names);
  printSuggestions(suggestions, unmatched);
  if (apply) {
    await applySuggestions(payload, suggestions, targets);
  } else {
    log();
    log("Dry run: nothing written. Add `apply` to save these as datesVisited.");
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
