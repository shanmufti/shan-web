/**
 * Logic checks for the browser tools in lib/tools and the short-link
 * validators. Run: npx tsx scripts/test-tools.ts
 */
import assert from "node:assert/strict";

import { validateDestination, validateShortLinkSlug } from "../lib/short-links";
import { explainCron, nextRuns, parseCron } from "../lib/tools/cron";
import {
  base64Decode,
  base64Encode,
  queryParams,
  urlDecode,
  urlEncode,
} from "../lib/tools/encoding";
import { digest, digestAll } from "../lib/tools/hash";
import { nanoid, uuidV4, uuidV7, uuidV7Time } from "../lib/tools/ids";
import { diffJson, formatJson, minifyJson, parseJson } from "../lib/tools/json";
import { decodeJwt, expiryStatus } from "../lib/tools/jwt";
import { runRegex, segmentText } from "../lib/tools/regex";
import {
  formatInZone,
  parseTimeInput,
  parseWallTime,
  zonedTimeToMs,
  zoneOffsetMinutes,
} from "../lib/tools/time";
import { jsonToYaml, yamlToJson } from "../lib/tools/yaml";

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

await test("json format/minify/sort", () => {
  assert.equal(
    ok(formatJson('{"b":1,"a":[1,2]}')).output,
    '{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}',
  );
  assert.equal(
    ok(formatJson('{"b":1,"a":2}', { sortKeys: true, indent: 0 })).output,
    '{"a":2,"b":1}',
  );
  assert.equal(ok(minifyJson('{ "a" : [ 1 , 2 ] }')).output, '{"a":[1,2]}');
});

await test("json error position", () => {
  const r = bad(parseJson('{\n  "a": 1,\n  "b": }'));
  assert.equal(r.line, 3);
  assert.match(r.error, /line 3/);
  bad(parseJson("   "));
  assert.match(bad(parseJson("[1,2,]")).error, /column 6: Trailing comma/);
  assert.match(
    bad(parseJson("{'a':1}")).error,
    /property name in double quotes/,
  );
  assert.match(bad(parseJson('{"a":1} x')).error, /after the JSON value/);
  assert.match(bad(parseJson('"a\nb"')).error, /control character/);
});

await test("json diff", () => {
  const d = diffJson(
    { a: 1, b: [1, 2], c: { "x-y": true } },
    { a: 2, b: [1], c: { "x-y": true }, d: null },
  );
  assert.deepEqual(d, [
    { path: "$.a", kind: "changed", before: 1, after: 2 },
    { path: "$.b[1]", kind: "removed", before: 2 },
    { path: "$.d", kind: "added", after: null },
  ]);
  assert.deepEqual(diffJson({ a: 1 }, { a: 1 }), []);
  assert.deepEqual(
    diffJson({ q: { "x-y": 1 } }, { q: { "x-y": "1" } })[0]?.path,
    '$.q["x-y"]',
  );
});

await test("yaml <-> json", () => {
  assert.equal(
    ok(yamlToJson("a: 1\nb:\n  - x\n  - true\n", 0)).output,
    '{"a":1,"b":["x",true]}',
  );
  assert.equal(
    ok(yamlToJson("a: 1\n---\nb: 2\n", 0)).output,
    '[{"a":1},{"b":2}]',
  );
  assert.equal(ok(jsonToYaml('{"a":1,"b":["x"]}')).output, "a: 1\nb:\n  - x\n");
  const e = bad(yamlToJson("a: [1, 2\nb: 3"));
  assert.match(e.error, /Invalid YAML/);
  bad(jsonToYaml("{nope}"));
});

// A known HS256 sample token (jwt.io), with exp added.
const header = base64Encode(JSON.stringify({ alg: "HS256", typ: "JWT" }), true);
const payload = base64Encode(
  JSON.stringify({ sub: "123", name: "Zoë", iat: 1516239022, exp: 1516242622 }),
  true,
);
const token = `${header}.${payload}.c2lnbmF0dXJl`;

await test("jwt decode", () => {
  const r = ok(decodeJwt(`Bearer ${token}`));
  assert.equal(r.jwt.header["alg"], "HS256");
  assert.equal((r.jwt.payload as { name: string }).name, "Zoë");
  assert.deepEqual(
    r.jwt.times.map((t) => t.name),
    ["iat", "exp"],
  );
  assert.equal(expiryStatus(r.jwt, Date.now()), "expired");
  assert.equal(expiryStatus(r.jwt, 1516240000000), "valid");
  assert.match(bad(decodeJwt("a.b")).error, /3 parts/);
  assert.match(bad(decodeJwt("a.b.c.d.e")).error, /JWE/);
  assert.match(bad(decodeJwt("!!!.e30.x")).error, /header/);
});

await test("base64", () => {
  assert.equal(base64Encode("héllo ✓"), "aMOpbGxvIOKckw==");
  assert.equal(base64Encode("héllo ✓", true), "aMOpbGxvIOKckw");
  assert.equal(base64Encode("\xff\xfe?>", true).includes("+"), false);
  assert.equal(ok(base64Decode("aMOpbGxvIOKckw")).output, "héllo ✓");
  assert.equal(ok(base64Decode("aMOp bGxv\nIOKckw==")).output, "héllo ✓");
  assert.equal(ok(base64Decode(base64Encode("a?b>c~", true))).output, "a?b>c~");
  assert.match(bad(base64Decode("abc$")).error, /not Base64/);
  assert.match(bad(base64Decode("/w==")).error, /not UTF-8/);
  assert.match(bad(base64Decode("abcde")).error, /Length/);
});

await test("url encode/decode", () => {
  assert.equal(urlEncode("a b&c=é/"), "a%20b%26c%3D%C3%A9%2F");
  assert.equal(
    urlEncode("https://x.dev/a b?q=é", "uri"),
    "https://x.dev/a%20b?q=%C3%A9",
  );
  assert.equal(ok(urlDecode("a%20b%26c")).output, "a b&c");
  assert.equal(ok(urlDecode("a+b", { plusAsSpace: true })).output, "a b");
  assert.match(bad(urlDecode("100%")).error, /position 4/);
  bad(urlDecode("%E0%A4%A"));
  assert.deepEqual(queryParams("https://x.dev/?a=1&b=two%20words"), [
    ["a", "1"],
    ["b", "two words"],
  ]);
  assert.equal(queryParams("not a url"), null);
});

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

await test("cron parse + explain", () => {
  const e = (x: string) => explainCron(ok(parseCron(x)).schedule);
  assert.equal(e("*/15 * * * *"), "Every 15 minutes past every hour.");
  assert.equal(e("30 9 * * 1-5"), "At 09:30, on Monday through Friday.");
  assert.equal(e("0 0 1 1 *"), "At 00:00, on day-of-month 1st, in January.");
  assert.equal(e("@daily"), "At 00:00.");
  assert.equal(e("0 9,17 * * MON"), "At 09:00 and 17:00, on Monday.");
  assert.equal(e("* * * * *"), "Every minute.");
  assert.equal(
    e("0 0 13 * 5"),
    "At 00:00, on day-of-month 13th, or on Friday.",
  );
  assert.equal(
    e("5 */2 * JAN-MAR *"),
    "At minute 5, every 2 hours, in January through March.",
  );
  assert.match(bad(parseCron("0 0 * *")).error, /Expected 5/);
  assert.match(bad(parseCron("0 0 0 * * *")).error, /6 fields/);
  assert.match(bad(parseCron("60 * * * *")).error, /out of range/);
  assert.match(bad(parseCron("0 0 L * *")).error, /Quartz/);
  assert.match(bad(parseCron("0 0 * * 5-1")).error, /backwards/);
  assert.match(bad(parseCron("*/0 * * * *")).error, /positive/);
  assert.equal(ok(parseCron("0 0 * * 7")).schedule.dayOfWeek.values[0], 0);
});

await test("cron next runs", () => {
  const from = new Date(Date.UTC(2026, 10, 14, 10, 0)); // Sat 14 Nov 2026
  const iso = (x: string) =>
    nextRuns(ok(parseCron(x)).schedule, 5, from, "utc").map((d) =>
      d.toISOString(),
    );
  assert.deepEqual(iso("30 9 * * 1-5").slice(0, 2), [
    "2026-11-16T09:30:00.000Z",
    "2026-11-17T09:30:00.000Z",
  ]);
  assert.deepEqual(iso("*/20 * * * *").slice(0, 3), [
    "2026-11-14T10:20:00.000Z",
    "2026-11-14T10:40:00.000Z",
    "2026-11-14T11:00:00.000Z",
  ]);
  assert.deepEqual(iso("0 0 29 2 *").slice(0, 1), ["2028-02-29T00:00:00.000Z"]);
  // dom OR dow: the 13th or any Friday.
  assert.deepEqual(iso("0 0 13 * 5").slice(0, 2), [
    "2026-11-20T00:00:00.000Z",
    "2026-11-27T00:00:00.000Z",
  ]);
  assert.equal(iso("0 0 31 2 *").length, 0);
  assert.equal(
    nextRuns(ok(parseCron("0 12 * * *")).schedule, 5, from, "local").length,
    5,
  );
});

await test("cron DST (only checked when TZ=America/New_York)", () => {
  if (Intl.DateTimeFormat().resolvedOptions().timeZone !== "America/New_York") {
    return;
  }
  const runs = nextRuns(
    ok(parseCron("30 2 * * *")).schedule,
    3,
    new Date(2026, 2, 7, 12, 0),
    "local",
  ).map((d) => d.getDate());
  // 2:30 on 8 March 2026 doesn't exist locally (clocks jump 2:00 -> 3:00).
  assert.deepEqual(runs, [9, 10, 11]);
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

await test("ids", () => {
  const v4 = uuidV4();
  assert.match(
    v4,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  const t = Date.UTC(2026, 10, 14);
  const v7 = uuidV7(t);
  assert.match(
    v7,
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  assert.equal(uuidV7Time(v7), t);
  assert.equal(uuidV7Time(v4), null);
  assert.ok(uuidV7(t) < uuidV7(t + 1));
  assert.equal(
    new Set(Array.from({ length: 1000 }, () => uuidV4())).size,
    1000,
  );
  assert.match(nanoid(), /^[\w-]{21}$/);
  assert.match(nanoid(10, "abc"), /^[abc]{10}$/);
  // Uniformity sanity check for a non-power-of-two alphabet.
  const counts = new Map<string, number>();
  for (const c of nanoid(256, "0123456789"))
    counts.set(c, (counts.get(c) ?? 0) + 1);
  assert.equal(counts.size, 10);
  assert.throws(() => nanoid(0));
  assert.throws(() => nanoid(5, "a"));
});

await test("hash", async () => {
  assert.equal(
    (await digest("SHA-256", "abc")).hex,
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  assert.equal(
    (await digest("SHA-1", "abc")).hex,
    "a9993e364706816aba3e25717850c26c9cd0d89d",
  );
  const all = await digestAll("");
  assert.equal(all["SHA-512"].hex.slice(0, 16), "cf83e1357eefb8bd");
  assert.equal(
    all["SHA-256"].base64,
    "47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=",
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
