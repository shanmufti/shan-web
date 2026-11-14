/**
 * Tests for the Google Maps and calendar import helpers, against the fake
 * exports in scripts/fixtures/. Run: npx tsx --test scripts/*.test.ts
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { newPlace, placeChanges } from "../lib/google-maps-sync";
import {
  cidFromUrl,
  coordinatesFromUrl,
  destinationTitle,
  emptyTakeout,
  guessCategory,
  isCatchAllList,
  parseCsv,
  planImport,
  readAssignments,
  readListCsv,
  readSavedPlacesJson,
  reviewCsv,
  type ListMapping,
} from "../lib/google-maps-takeout";
import { mergeRanges, parseIcs, suggestTripDates } from "../lib/ics-trips";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, "fixtures");
const takeout = path.join(fixtures, "google-maps-takeout");

async function loadFixture() {
  const data = emptyTakeout();
  for (const name of ["Lisbon trip", "Oaxaca", "Want to go"]) {
    readListCsv(
      data,
      name,
      await readFile(path.join(takeout, "Saved", `${name}.csv`), "utf8"),
    );
  }
  readSavedPlacesJson(
    data,
    "Saved Places",
    await readFile(
      path.join(takeout, "Maps (your places)", "Saved Places.json"),
      "utf8",
    ),
  );
  return data;
}

void test("parseCsv handles quotes, commas and newlines", () => {
  const rows = parseCsv('a,b\n"x, y","line 1\nline ""2"""\n');
  assert.deepEqual(rows, [
    ["a", "b"],
    ["x, y", 'line 1\nline "2"'],
  ]);
});

void test("coordinatesFromUrl reads every URL shape", () => {
  assert.deepEqual(
    coordinatesFromUrl(
      "https://www.google.com/maps/place/X/@17.06,-96.72,17z/data=!8m2!3d17.0651!4d-96.7231",
    ),
    { lat: 17.0651, lng: -96.7231 },
  );
  assert.deepEqual(
    coordinatesFromUrl("https://www.google.com/maps?q=38.7139,-9.1334"),
    { lat: 38.7139, lng: -9.1334 },
  );
  assert.deepEqual(
    coordinatesFromUrl("https://www.google.com/maps/search/17.0436,+-96.7678"),
    { lat: 17.0436, lng: -96.7678 },
  );
  assert.deepEqual(
    coordinatesFromUrl(
      "https://www.google.com/maps/place/X/@17.0702,-96.7301,15z",
    ),
    { lat: 17.0702, lng: -96.7301 },
  );
  assert.equal(
    coordinatesFromUrl(
      "https://www.google.com/maps/place/X/data=!4m2!3m1!1s0x0:0x7777",
    ),
    null,
  );
  assert.equal(coordinatesFromUrl("https://www.google.com/maps?q=0,0"), null);
});

void test("cidFromUrl matches CSV feature ids to GeoJSON cids", () => {
  assert.equal(
    cidFromUrl(
      "https://www.google.com/maps/place/M/data=!1s0x85c7:0x1a2b3c4d5e6f7081",
    ),
    "1885667171979194497",
  );
  assert.equal(
    // eslint-disable-next-line sonarjs/no-clear-text-protocols -- GeoJSON exports use http URLs
    cidFromUrl("http://maps.google.com/?cid=1885667171979194497"),
    "1885667171979194497",
  );
});

void test("list helpers", () => {
  assert.ok(isCatchAllList("Want to go"));
  assert.ok(isCatchAllList("Favourites"));
  assert.ok(!isCatchAllList("Oaxaca"));
  assert.equal(destinationTitle("🇲🇽 Oaxaca!"), "Oaxaca");
  assert.equal(guessCategory("Café Fictivo"), "cafe");
  assert.equal(guessCategory("Taquería Inventada"), "restaurant");
  assert.equal(guessCategory("Hostel Inventado"), "hotel");
  assert.equal(guessCategory("Miradouro Fictício"), "viewpoint");
  assert.equal(guessCategory("Belém Tower"), "other");
  assert.equal(guessCategory("Mirador del Ejemplo"), "viewpoint");
});

void test("reads the fixture export and dedupes across lists and formats", async () => {
  const data = await loadFixture();
  assert.equal(data.lists.length, 4);
  assert.deepEqual(data.warnings, []);
  const oaxaca = data.lists.find((l) => l.name === "Oaxaca");
  assert.match(oaxaca?.description ?? "", /Three days in the city/);
  assert.equal(oaxaca?.placeKeys.length, 5);

  // Mercado: CSV (no coordinates) + starred GeoJSON (coordinates, address).
  const mercado = data.places.get("cid:1885667171979194497");
  assert.ok(mercado);
  assert.deepEqual(mercado.lists, ["Oaxaca", "Saved Places"]);
  assert.deepEqual(mercado.coordinates, { lat: 17.0612, lng: -96.7262 });
  assert.match(mercado.address ?? "", /Calle Ejemplo/);
  assert.match(mercado.note, /tlayuda/);

  // Café saved in a destination list and in "Want to go".
  const cafe = [...data.places.values()].filter(
    (p) => p.name === "Café Fictivo",
  );
  assert.equal(cafe.length, 1);
  assert.deepEqual(cafe[0]?.lists, ["Oaxaca", "Want to go"]);
  assert.match(cafe[0].note, /Closed Mondays/);

  // 0,0 in GeoJSON means "no coordinates".
  const old = [...data.places.values()].find(
    (p) => p.name === "Old-format place",
  );
  assert.equal(old?.coordinates, null);
  // 5 Oaxaca + 4 Lisbon + 3 new in Want to go + 2 new starred = 14
  assert.equal(data.places.size, 14);
});

void test("planImport maps lists to destinations and catch-alls to review", async () => {
  const data = await loadFixture();
  const mapping = JSON.parse(
    await readFile(path.join(fixtures, "google-maps-map.json"), "utf8"),
  ) as ListMapping;
  const plan = planImport(data, { mapping });

  assert.deepEqual(
    plan.destinations.map((d) => [
      d.slug,
      d.title,
      d.country,
      d.placeKeys.length,
    ]),
    [
      ["lisbon", "Lisbon", "PRT", 4],
      ["oaxaca", "Oaxaca", "MEX", 5],
    ],
  );
  assert.equal(plan.assignments.size, 9);
  // Want to go: café already in Oaxaca; 3 left. Saved Places: Mercado in
  // Oaxaca; 2 left.
  assert.equal(plan.review.length, 5);
  const hierve = plan.review.find((r) => r.name === "Hierve el Ejemplo");
  assert.equal(hierve?.suggested, "oaxaca");
  assert.equal(hierve.confidence, "medium");
  const livraria = plan.review.find((r) => r.name === "Livraria Exemplo");
  assert.equal(livraria?.suggested, "lisbon");
  assert.equal(livraria.confidence, "high");
  const nowhere = plan.review.find(
    (r) => r.name === "Somewhere without coordinates",
  );
  assert.equal(nowhere?.confidence, "none");

  // Round trip through the review file.
  const csv = reviewCsv(plan).replace(/(Livraria Exemplo,.*),$/m, "$1,lisbon");
  const assigned = readAssignments(csv);
  assert.equal(assigned.size, 1);
  const second = planImport(data, { mapping, assigned });
  assert.equal(second.assignments.size, 10);
  assert.equal(second.review.length, 4);
  const skipped = readAssignments(
    reviewCsv(second).replace(/(Sintra Palace \(example\),.*),$/m, "$1,skip"),
  );
  const third = planImport(data, { mapping, assigned: skipped });
  assert.ok(!third.review.some((r) => r.name.startsWith("Sintra")));
  assert.ok(
    second.destinations
      .find((d) => d.slug === "lisbon")
      ?.placeKeys.includes([...assigned.keys()][0] ?? ""),
  );
});

void test("planImport without a mapping uses list names and existing destinations", async () => {
  const data = await loadFixture();
  const plan = planImport(data, {
    existing: [
      {
        id: 7,
        slug: "lisboa",
        title: "Lisboa",
        sourceLists: ["Lisbon trip"],
        coordinates: null,
      },
    ],
  });
  const lisbon = plan.destinations.find((d) => d.lists.includes("Lisbon trip"));
  assert.equal(lisbon?.slug, "lisboa");
  assert.equal(lisbon.existingId, 7);
  assert.ok(lisbon.centroid);
  assert.equal(
    plan.destinations.find((d) => d.slug === "oaxaca")?.existingId,
    null,
  );
});

void test("parseIcs and suggestTripDates", async () => {
  const events = parseIcs(
    await readFile(path.join(fixtures, "trips.ics"), "utf8"),
  );
  assert.equal(events.length, 5);
  assert.deepEqual(events[0], {
    summary: "Oaxaca",
    location: "",
    start: "2024-03-10",
    end: "2024-03-15",
  });
  assert.equal(events[1]?.summary, "Oaxaca coast, then back to the city");

  const { suggestions, unmatched } = suggestTripDates(events, [
    { slug: "oaxaca", names: ["Oaxaca"] },
    { slug: "lisbon", names: ["Lisbon", "Lisbon trip"] },
  ]);
  assert.deepEqual(
    suggestions.map((s) => [s.slug, s.ranges.map((r) => `${r.from}..${r.to}`)]),
    [
      ["oaxaca", ["2024-03-10..2024-03-17"]],
      ["lisbon", ["2023-09-04..2023-09-10"]],
    ],
  );
  // The flight is logistics; Porto has no destination.
  assert.deepEqual(
    unmatched.map((e) => e.summary),
    ["Weekend in Porto"],
  );
});

void test("mergeRanges keeps separate stays apart", () => {
  const merged = mergeRanges([
    { from: "2024-07-17", to: "2024-08-04", events: ["b"] },
    { from: "2024-06-02", to: "2024-06-10", events: ["a"] },
    { from: "2024-06-11", to: "2024-06-12", events: ["c"] },
  ]);
  assert.deepEqual(
    merged.map((r) => [r.from, r.to]),
    [
      ["2024-06-02", "2024-06-12"],
      ["2024-07-17", "2024-08-04"],
    ],
  );
});

void test("placeChanges refreshes import fields and keeps owner edits", () => {
  const place = {
    key: "cid:1",
    name: "Café Fictivo",
    note: "From the export",
    url: "https://www.google.com/maps/place/X",
    coordinates: { lat: 1, lng: 2 },
    address: null,
    lists: ["Oaxaca"],
  };
  const created = newPlace(place, 4, "public");
  assert.equal(created.category, "cafe");
  assert.equal(created.note, "From the export");
  const current = {
    name: "Café Fictivo",
    sourceList: "Oaxaca",
    googleMapsUrl: "https://www.google.com/maps/place/X",
    address: null,
    coordinates: { lat: 1, lng: 2 },
    destination: 4,
    note: "My edited note",
  };
  assert.equal(placeChanges(current, place, 4), null);
  assert.deepEqual(
    placeChanges({ ...current, note: "" }, { ...place, name: "Renamed" }, 5),
    { name: "Renamed", destination: 5, note: "From the export" },
  );
});
