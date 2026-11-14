/**
 * Logic checks for the browser tools in lib/tools and the short-link
 * validators. Run: npx tsx scripts/test-tools.ts
 */
import assert from "node:assert/strict";

import { validateDestination, validateShortLinkSlug } from "../lib/short-links";
import { runRegex, segmentText } from "../lib/tools/regex";
import {
  formatInZone,
  parseTimeInput,
  parseWallTime,
  zonedTimeToMs,
  zoneOffsetMinutes,
} from "../lib/tools/time";

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  assert.equal(r.ok, true, JSON.stringify(r));
  return r as Extract<T, { ok: true }>;
}
function bad<T extends { ok: boolean }>(r: T): Extract<T, { ok: false }> {
  assert.equal(r.ok, false, JSON.stringify(r));
  return r as Extract<T, { ok: false }>;
}

await test("timestamps", () => {
  const s = ok(parseTimeInput("1700000000"));
  assert.equal(s.ms, 1700000000000);
  assert.match(s.detected, /seconds/);
  assert.equal(ok(parseTimeInput("1700000000123")).ms, 1700000000123);
  assert.equal(ok(parseTimeInput("1700000000123456")).ms, 1700000000123);
  assert.equal(ok(parseTimeInput("1700000000", "ms")).ms, 1700000000);
  assert.equal(ok(parseTimeInput("2023-11-14T22:13:20Z")).ms, 1700000000000);
  bad(parseTimeInput("tomorrowish"));
  bad(parseTimeInput("99999999999999999999999"));
  assert.equal(
    formatInZone(1700000000000, "UTC"),
    "2023-11-14 22:13:20 (UTC+00:00)",
  );
  assert.equal(
    formatInZone(1700000000000, "Asia/Kolkata"),
    "2023-11-15 03:43:20 (UTC+05:30)",
  );
  assert.equal(
    zoneOffsetMinutes(Date.UTC(2026, 6, 1), "America/New_York"),
    -240,
  );
  assert.equal(
    zoneOffsetMinutes(Date.UTC(2026, 0, 1), "America/New_York"),
    -300,
  );
  const wall = parseWallTime("2026-07-01T09:30");
  assert.ok(wall);
  assert.equal(
    zonedTimeToMs(wall, "America/New_York"),
    Date.UTC(2026, 6, 1, 13, 30),
  );
  assert.equal(
    zonedTimeToMs(wall, "Europe/London"),
    Date.UTC(2026, 6, 1, 8, 30),
  );
});

await test("regex", () => {
  const r = ok(runRegex("(?<word>\\w+)@(\\w+)", "g", "a@b, cc@dd"));
  assert.equal(r.matches.length, 2);
  assert.deepEqual(r.matches[1]?.groups, [
    { name: "$1", value: "cc" },
    { name: "$2", value: "dd" },
    { name: "word", value: "cc" },
  ]);
  assert.equal(ok(runRegex("x*", "g", "abc")).matches.length, 4);
  assert.equal(ok(runRegex("", "g", "abc")).matches.length, 0);
  assert.equal(ok(runRegex("b", "", "abcb")).matches.length, 1);
  assert.equal(ok(runRegex("a", "g", "a".repeat(5000))).truncated, true);
  assert.equal(ok(runRegex("(?:)", "gu", "😀😀")).matches.length, 3);
  assert.match(bad(runRegex("(", "g", "")).error, /Invalid|Unterminated/);
  assert.match(bad(runRegex("a", "gq", "")).error, /Unknown flag/);
  assert.match(bad(runRegex("a", "gg", "")).error, /once/);
  const seg = segmentText("xaybz", ok(runRegex("[ab]", "g", "xaybz")).matches);
  assert.deepEqual(
    seg.map((s) => [s.text, s.match]),
    [
      ["x", null],
      ["a", 0],
      ["y", null],
      ["b", 1],
      ["z", null],
    ],
  );
});

await test("short link validation", () => {
  assert.equal(validateShortLinkSlug("cv-2026"), true);
  assert.equal(typeof validateShortLinkSlug("-x"), "string");
  assert.equal(typeof validateShortLinkSlug("Has Space"), "string");
  assert.equal(validateDestination("https://example.com/a?b=1"), true);
  assert.equal(validateDestination("http://example.com"), true);
  assert.equal(typeof validateDestination("javascript:alert(1)"), "string");
  assert.equal(typeof validateDestination("mailto:a@example.com"), "string");
  assert.equal(typeof validateDestination("example.com"), "string");
  assert.equal(
    typeof validateDestination("https://user:pw@example.com"),
    "string",
  );
});

process.stdout.write(`All ${String(passed)} tool checks passed.` + "\n");
