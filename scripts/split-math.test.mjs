// Unit tests for the cost splitter and group plan maths.
// Run: npm test   (node --experimental-strip-types --test scripts/*.test.mjs)
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  allocate,
  balances,
  currencyDigits,
  formatMoney,
  parseAmount,
  settleUp,
} from "../lib/split-math.ts";
import { isVoteRevealed, tallyDates, tallyVotes } from "../lib/plan-tally.ts";

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const total = (map) => sum([...map.values()]);

test("allocate: equal split hands leftover cents to the first people", () => {
  assert.deepEqual(allocate(1000, [1, 1, 1]), [334, 333, 333]);
  assert.deepEqual(allocate(1001, [1, 1, 1]), [334, 334, 333]);
  assert.deepEqual(allocate(1, [1, 1, 1]), [1, 0, 0]);
  assert.deepEqual(allocate(0, [1, 1]), [0, 0]);
});

test("allocate: uneven shares use the largest remainder", () => {
  // 1000 split 1:2 -> 333.33 / 666.67 -> second has the larger remainder.
  assert.deepEqual(allocate(1000, [1, 2]), [333, 667]);
  // 1000 split 2:1:1 -> exact.
  assert.deepEqual(allocate(1000, [2, 1, 1]), [500, 250, 250]);
  // 10.00 split 1.5 : 1 : 0.5 -> 5.00 / 3.33 / 1.67 (remainders .33 and .67).
  assert.deepEqual(allocate(1000, [1.5, 1, 0.5]), [500, 333, 167]);
  // Many people, prime amount: still exact.
  const parts = allocate(9973, [3, 1, 4, 1, 5, 9, 2, 6]);
  assert.equal(sum(parts), 9973);
  for (const p of parts) assert.ok(Number.isInteger(p));
});

test("allocate: rejects bad input", () => {
  assert.throws(() => allocate(10, [0, 0]));
  assert.throws(() => allocate(1.5, [1]));
  assert.throws(() => allocate(-1, [1]));
});

test("balances always sum to zero", () => {
  const people = ["a", "b", "c"];
  const expenses = [
    {
      amount: 1000,
      paidBy: "a",
      shares: people.map((p) => ({ personId: p, weight: 1 })),
    },
    {
      amount: 2501,
      paidBy: "b",
      shares: [
        { personId: "a", weight: 1 },
        { personId: "c", weight: 2 },
      ],
    },
    {
      amount: 7,
      paidBy: "c",
      shares: people.map((p) => ({ personId: p, weight: 1 })),
    },
  ];
  const b = balances(people, expenses);
  assert.equal(total(b), 0);
  // a: paid 1000, owes 334 + 834 + 3 = 1171 -> -171
  // b: paid 2501, owes 333 + 0 + 2 = 335 -> 2166
  // c: paid 7, owes 333 + 1667 + 2 = 2002 -> -1995
  assert.deepEqual(
    [...b.entries()],
    [
      ["a", -171],
      ["b", 2166],
      ["c", -1995],
    ],
  );
});

test("settleUp: greedy min cash flow clears every balance", () => {
  const b = new Map([
    ["a", -171],
    ["b", 2166],
    ["c", -1995],
  ]);
  assert.deepEqual(settleUp(b), [
    { from: "c", to: "b", amount: 1995 },
    { from: "a", to: "b", amount: 171 },
  ]);
});

test("settleUp: chain of debts collapses, ties broken by list order", () => {
  // a paid 30 for a, b, c (10 each); b paid 30 for a, b, c.
  const people = ["a", "b", "c", "d"];
  const equal = (ids) => ids.map((id) => ({ personId: id, weight: 1 }));
  const b = balances(people, [
    { amount: 3000, paidBy: "a", shares: equal(["a", "b", "c"]) },
    { amount: 3000, paidBy: "b", shares: equal(["a", "b", "c"]) },
    { amount: 4000, paidBy: "d", shares: equal(people) },
  ]);
  // a: +3000 -1000 -1000 -1000 = 0; b: same 0; c: -2000 -1000 = -3000; d: +3000
  assert.deepEqual([...b.values()], [0, 0, -3000, 3000]);
  assert.deepEqual(settleUp(b), [{ from: "c", to: "d", amount: 3000 }]);

  const ties = new Map([
    ["p", 500],
    ["q", 500],
    ["r", -500],
    ["s", -500],
  ]);
  assert.deepEqual(settleUp(ties), [
    { from: "r", to: "p", amount: 500 },
    { from: "s", to: "q", amount: 500 },
  ]);
});

test("settleUp: random groups settle exactly in at most n - 1 payments", () => {
  let seed = 42;
  const rand = (n) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };
  for (let round = 0; round < 300; round++) {
    const n = 2 + rand(8);
    const people = Array.from({ length: n }, (_, i) => `p${i}`);
    const expenses = Array.from({ length: 1 + rand(12) }, () => {
      const chosen = people.filter(() => rand(3) > 0);
      const who = chosen.length > 0 ? chosen : [people[0]];
      return {
        amount: 1 + rand(100000),
        paidBy: people[rand(n)],
        shares: who.map((id) => ({ personId: id, weight: 1 + rand(4) / 2 })),
      };
    });
    const b = balances(people, expenses);
    assert.equal(total(b), 0);
    const payments = settleUp(b);
    assert.ok(payments.length <= n - 1);
    const after = new Map(b);
    for (const p of payments) {
      assert.ok(p.amount > 0 && Number.isInteger(p.amount));
      after.set(p.from, after.get(p.from) + p.amount);
      after.set(p.to, after.get(p.to) - p.amount);
    }
    for (const v of after.values()) assert.equal(v, 0);
  }
});

test("parseAmount and formatMoney respect currency digits", () => {
  assert.equal(currencyDigits("USD"), 2);
  assert.equal(currencyDigits("JPY"), 0);
  assert.equal(parseAmount("12", 2), 1200);
  assert.equal(parseAmount("12.5", 2), 1250);
  assert.equal(parseAmount("1,234.56", 2), 123456);
  assert.equal(parseAmount("0.01", 2), 1);
  assert.equal(parseAmount("12.345", 2), null);
  assert.equal(parseAmount("0", 2), null);
  assert.equal(parseAmount("-5", 2), null);
  assert.equal(parseAmount("abc", 2), null);
  assert.equal(parseAmount("1200", 0), 1200);
  assert.equal(parseAmount("12.5", 0), null);
  assert.equal(formatMoney(123450, "USD"), "$1,234.50");
  assert.equal(formatMoney(-310, "EUR"), "-€3.10");
  assert.equal(formatMoney(1200, "JPY"), "¥1,200");
});

test("tallyDates picks the best date", () => {
  const { dates, best } = tallyDates(
    ["d1", "d2", "d3"],
    [
      { participantId: "a", marks: { d1: "yes", d2: "maybe", d3: "no" } },
      { participantId: "b", marks: { d1: "maybe", d2: "yes", d3: "yes" } },
      { participantId: "c", marks: { d1: "no", d2: "yes", d3: "bogus" } },
    ],
  );
  assert.deepEqual(
    dates.map((d) => d.score),
    [3, 5, 2],
  );
  assert.equal(best, "d2");
  // Tie on score: more yeses wins, then the earlier date.
  assert.equal(
    tallyDates(
      ["x", "y"],
      [
        { participantId: "a", marks: { x: "maybe", y: "yes" } },
        { participantId: "b", marks: { x: "maybe", y: "no" } },
      ],
    ).best,
    "y",
  );
  assert.equal(
    tallyDates(
      ["x", "y"],
      [{ participantId: "a", marks: { x: "yes", y: "yes" } }],
    ).best,
    "x",
  );
  assert.equal(tallyDates(["x"], []).best, null);
});

test("tallyVotes: single and ranked", () => {
  const single = tallyVotes(["a", "b", "c"], "single", [
    ["b"],
    ["a"],
    ["b"],
    ["zzz"],
  ]);
  assert.deepEqual(
    single.map((t) => [t.optionId, t.points]),
    [
      ["b", 2],
      ["a", 1],
      ["c", 0],
    ],
  );
  const ranked = tallyVotes(["a", "b", "c", "d"], "ranked", [
    ["a", "b", "c"],
    ["b", "a", "d"],
    ["c", "b", "b"], // duplicate b counts once
  ]);
  // a: 3 + 2 = 5, b: 2 + 3 + 2 = 7, c: 1 + 3 = 4, d: 1
  assert.deepEqual(
    ranked.map((t) => [t.optionId, t.points]),
    [
      ["b", 7],
      ["a", 5],
      ["c", 4],
      ["d", 1],
    ],
  );
});

test("isVoteRevealed", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  assert.equal(isVoteRevealed({ sealed: false }, now), true);
  assert.equal(isVoteRevealed({ sealed: true }, now), false);
  assert.equal(
    isVoteRevealed({ sealed: true, revealAt: "2026-06-01T13:00:00Z" }, now),
    false,
  );
  assert.equal(
    isVoteRevealed({ sealed: true, revealAt: "2026-06-01T12:00:00Z" }, now),
    true,
  );
});
