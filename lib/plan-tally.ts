/**
 * Group plan tallies. Pure functions, no imports, so the unit tests in
 * scripts/split-math.test.mjs can load this file directly.
 */

export const DATE_ANSWERS = ["yes", "maybe", "no"] as const;
export type DateAnswer = (typeof DATE_ANSWERS)[number];

export function isDateAnswer(value: unknown): value is DateAnswer {
  return (
    typeof value === "string" &&
    (DATE_ANSWERS as readonly string[]).includes(value)
  );
}

export const RSVP_STATUSES = ["yes", "maybe", "no"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export function isRsvpStatus(value: unknown): value is RsvpStatus {
  return (
    typeof value === "string" &&
    (RSVP_STATUSES as readonly string[]).includes(value)
  );
}

export interface DateTally {
  dateId: string;
  yes: string[];
  maybe: string[];
  no: string[];
  /** yes = 2 points, maybe = 1. */
  score: number;
}

/**
 * Counts answers per candidate date and picks the best one: highest score,
 * then most yeses, then the earliest in the list. `best` is null until
 * someone has said yes or maybe to something.
 */
export function tallyDates(
  dateIds: string[],
  answers: { participantId: string; marks: Record<string, unknown> }[],
): { dates: DateTally[]; best: string | null } {
  const dates = dateIds.map((dateId) => {
    const tally: DateTally = { dateId, yes: [], maybe: [], no: [], score: 0 };
    for (const { participantId, marks } of answers) {
      const mark = marks[dateId];
      if (isDateAnswer(mark)) tally[mark].push(participantId);
    }
    tally.score = tally.yes.length * 2 + tally.maybe.length;
    return tally;
  });
  let best: DateTally | null = null;
  for (const d of dates) {
    if (d.score === 0) continue;
    if (
      !best ||
      d.score > best.score ||
      (d.score === best.score && d.yes.length > best.yes.length)
    ) {
      best = d;
    }
  }
  return { dates, best: best?.dateId ?? null };
}

export type VoteMode = "single" | "ranked";

/** Points for 1st, 2nd and 3rd place in a ranked vote. */
export const RANK_POINTS = [3, 2, 1] as const;

export interface OptionTally {
  optionId: string;
  /** Single: votes. Ranked: points (3 / 2 / 1). */
  points: number;
  /** People who put this option first (or chose it, in a single vote). */
  firsts: number;
}

/**
 * Totals a vote. Unknown option ids are ignored, and an option repeated in
 * one ranking only counts once (at its best place). Sorted by points, then
 * first choices, then the order the options were listed.
 */
export function tallyVotes(
  optionIds: string[],
  mode: VoteMode,
  ballots: string[][],
): OptionTally[] {
  const known = new Set(optionIds);
  const totals = new Map<string, OptionTally>(
    optionIds.map((optionId) => [optionId, { optionId, points: 0, firsts: 0 }]),
  );
  for (const ballot of ballots) {
    const picks = [...new Set(ballot.filter((id) => known.has(id)))].slice(
      0,
      mode === "single" ? 1 : RANK_POINTS.length,
    );
    picks.forEach((id, place) => {
      const tally = totals.get(id);
      if (!tally) return;
      tally.points += mode === "single" ? 1 : (RANK_POINTS[place] ?? 0);
      if (place === 0) tally.firsts += 1;
    });
  }
  const order = new Map(optionIds.map((id, i) => [id, i]));
  return [...totals.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.firsts - a.firsts ||
      (order.get(a.optionId) ?? 0) - (order.get(b.optionId) ?? 0),
  );
}

/** Sealed votes stay hidden until the reveal time; no time means sealed. */
export function isVoteRevealed(
  block: { sealed?: boolean | null; revealAt?: string | null },
  now = new Date(),
): boolean {
  if (!block.sealed) return true;
  if (!block.revealAt) return false;
  return now.getTime() >= new Date(block.revealAt).getTime();
}
