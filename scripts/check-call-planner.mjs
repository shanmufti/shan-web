/**
 * Checks the call planner's time zone maths across DST changes.
 * Run: node --experimental-strip-types scripts/check-call-planner.mjs
 */
import assert from "node:assert/strict";

import {
  buildWeek,
  isAwake,
  isValidTimeZone,
  offsetMinutes,
  zonedParts,
  zonedStartOfDay,
} from "../lib/call-planner.ts";

const NY = "America/New_York";
const LONDON = "Europe/London";
const KARACHI = "Asia/Karachi";
const KOLKATA = "Asia/Kolkata";
const SANTIAGO = "America/Santiago";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`ok - ${name}`);
}

check("offsets", () => {
  assert.equal(offsetMinutes(Date.UTC(2026, 6, 1), NY), -240);
  assert.equal(offsetMinutes(Date.UTC(2026, 0, 15), NY), -300);
  assert.equal(offsetMinutes(Date.UTC(2026, 6, 1), LONDON), 60);
  assert.equal(offsetMinutes(Date.UTC(2026, 6, 1), KOLKATA), 330);
});

check("time zone validation", () => {
  assert.ok(isValidTimeZone(KARACHI));
  assert.ok(!isValidTimeZone("Mars/Olympus"));
  assert.ok(!isValidTimeZone(""));
});

check("start of day in New York, normal and DST days", () => {
  assert.equal(zonedStartOfDay(2026, 7, 1, NY), Date.UTC(2026, 6, 1, 4));
  // 8 Mar 2026 springs forward at 02:00, midnight is still EST.
  assert.equal(zonedStartOfDay(2026, 3, 8, NY), Date.UTC(2026, 2, 8, 5));
  // 1 Nov 2026 falls back at 02:00, midnight is still EDT.
  assert.equal(zonedStartOfDay(2026, 11, 1, NY), Date.UTC(2026, 10, 1, 4));
});

check("start of day where DST skips midnight (Santiago, 6 Sep 2026)", () => {
  const t = zonedStartOfDay(2026, 9, 6, SANTIAGO);
  const p = zonedParts(t, SANTIAGO);
  assert.equal(p.day, 6);
  assert.equal(p.hour, 1); // 00:00 doesn't exist that day
  assert.equal(zonedParts(t - 1, SANTIAGO).day, 5);
});

check("spring-forward day has no 02:00 cell", () => {
  const [day] = buildWeek({
    people: [{ name: "A", timeZone: NY }],
    refZone: NY,
    now: Date.UTC(2026, 2, 8, 15),
    wakeStart: 8,
    wakeEnd: 22,
    days: 1,
  });
  assert.ok(day);
  assert.equal(day.key, "2026-03-08");
  assert.equal(day.cells[2]?.instant, null);
  assert.equal(day.cells.filter((c) => c.instant !== null).length, 23);
  assert.deepEqual(day.windows, [{ start: 8, end: 22 }]);
});

check("fall-back day keeps 24 cells (first 01:00 wins)", () => {
  const [day] = buildWeek({
    people: [{ name: "A", timeZone: NY }],
    refZone: NY,
    now: Date.UTC(2026, 10, 1, 15),
    wakeStart: 8,
    wakeEnd: 22,
    days: 1,
  });
  assert.ok(day);
  assert.equal(day.cells.filter((c) => c.instant !== null).length, 24);
  assert.equal(day.cells[1]?.instant, Date.UTC(2026, 10, 1, 5)); // 01:00 EDT
  assert.equal(day.cells[3]?.instant, Date.UTC(2026, 10, 1, 8)); // 03:00 EST
});

check("London/New York gap week shifts overlap by an hour", () => {
  const people = [
    { name: "Ny", timeZone: NY },
    { name: "Lon", timeZone: LONDON },
  ];
  const week = (now) =>
    buildWeek({ people, refZone: NY, now, wakeStart: 8, wakeEnd: 22 });
  // 20 Oct: both on summer time, 5 h apart. London is awake 03:00–17:00 NY.
  assert.deepEqual(week(Date.UTC(2026, 9, 20, 16))[0]?.windows, [
    { start: 8, end: 17 },
  ]);
  // 28 Oct: London back on GMT, NY still EDT, 4 h apart.
  assert.deepEqual(week(Date.UTC(2026, 9, 28, 16))[0]?.windows, [
    { start: 8, end: 18 },
  ]);
  // 2 Nov: both on winter time, 5 h apart again.
  assert.deepEqual(week(Date.UTC(2026, 10, 2, 16))[0]?.windows, [
    { start: 8, end: 17 },
  ]);
  // The week starting 30 Oct crosses NY's change on 1 Nov.
  const crossing = week(Date.UTC(2026, 9, 30, 16));
  assert.deepEqual(
    crossing.map((d) => [d.key, d.windows[0]?.end]),
    [
      ["2026-10-30", 18],
      ["2026-10-31", 18],
      ["2026-11-01", 17],
      ["2026-11-02", 17],
      ["2026-11-03", 17],
      ["2026-11-04", 17],
      ["2026-11-05", 17],
    ],
  );
});

check("half-hour zone counts only whole awake hours", () => {
  // 08:00 UTC = 13:30 in Kolkata: awake. 16:00 UTC = 21:30: not a whole hour.
  assert.ok(isAwake(Date.UTC(2026, 0, 1, 8), KOLKATA, 8, 22));
  assert.ok(!isAwake(Date.UTC(2026, 0, 1, 16), KOLKATA, 8, 22));
  assert.ok(isAwake(Date.UTC(2026, 0, 1, 15), KOLKATA, 8, 22)); // 20:30–21:30
});

check("waking hours that wrap past midnight", () => {
  // 23:00 London in January.
  assert.ok(isAwake(Date.UTC(2026, 0, 1, 23), LONDON, 20, 4));
  assert.ok(!isAwake(Date.UTC(2026, 0, 1, 12), LONDON, 20, 4));
});

check("Karachi + New York overlap", () => {
  const [day] = buildWeek({
    people: [
      { name: "Ny", timeZone: NY },
      { name: "Khi", timeZone: KARACHI },
    ],
    refZone: KARACHI,
    now: Date.UTC(2026, 0, 14, 6),
    wakeStart: 8,
    wakeEnd: 22,
    days: 1,
  });
  // Karachi is UTC+5, NY UTC-5 in January: 10 h apart. NY 08:00 = 18:00 PKT.
  assert.deepEqual(day?.windows, [{ start: 18, end: 22 }]);
});

console.log(`\n${String(passed)} checks passed`);
