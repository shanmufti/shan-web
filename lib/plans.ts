import config from "@payload-config";
import { getPayload } from "payload";

import type { Plan } from "@/payload-types";
import {
  isDateAnswer,
  isVoteRevealed,
  tallyDates,
  tallyVotes,
  type DateAnswer,
  type DateTally,
  isRsvpStatus,
  type OptionTally,
  type RsvpStatus,
  type VoteMode,
} from "@/lib/plan-tally";
import { looksLikeToken } from "@/lib/tokens";

/**
 * Server side of group plans. The share slug is the only key. This is the
 * only code that reads `plan-responses`, and it drops sealed ballots before
 * building the view, so nothing sealed can reach a page or a client.
 */

export interface PlanPerson {
  id: string;
  name: string;
}

export interface RsvpAnswer {
  status: RsvpStatus;
  note: string;
  claims: string[];
}

export interface DatePollView {
  type: "datePoll";
  id: string;
  question: string;
  dates: { id: string; date: string; label: string | null }[];
  /** participantId → dateId → answer */
  answers: Record<string, Record<string, DateAnswer>>;
  tally: DateTally[];
  best: string | null;
}

export interface ChoiceVoteView {
  type: "choiceVote";
  id: string;
  question: string;
  mode: VoteMode;
  options: { id: string; label: string; detail: string | null }[];
  sealed: boolean;
  revealAt: string | null;
  /** Reveal time already formatted on the server (avoids time zone drift). */
  revealLabel: string | null;
  revealed: boolean;
  /** Can people still vote? */
  open: boolean;
  /** Who has voted (safe to show while sealed). */
  voters: string[];
  /** participantId → ranked option ids. Null while sealed. */
  ballots: Record<string, string[]> | null;
  /** Null while sealed. */
  tally: OptionTally[] | null;
}

export interface RsvpView {
  type: "rsvp";
  id: string;
  question: string;
  items: { id: string; name: string; note: string | null }[];
  answers: Record<string, RsvpAnswer>;
}

export interface NotesView {
  type: "notes";
  id: string;
  heading: string | null;
  body: string;
}

export type PlanBlockView =
  DatePollView | ChoiceVoteView | RsvpView | NotesView;

export interface PlanView {
  slug: string;
  title: string;
  intro: string | null;
  closed: boolean;
  people: PlanPerson[];
  blocks: PlanBlockView[];
}

/** Reveal times are shown in Vancouver time, like the food tour. */
function formatMoment(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Vancouver",
    timeZoneName: "short",
  });
}

export type PlanBlock = NonNullable<Plan["blocks"]>[number];

export async function findPlan(slug: string): Promise<Plan | null> {
  if (!looksLikeToken(slug)) return null;
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "plans",
    where: { shareSlug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return docs[0] ?? null;
}

export function planPeople(plan: Plan): PlanPerson[] {
  return (plan.participants ?? []).flatMap((p) =>
    p.id ? [{ id: p.id, name: p.name }] : [],
  );
}

function withIds<T extends { id?: string | null }>(
  rows: T[] | null | undefined,
): (T & { id: string })[] {
  return (rows ?? []).flatMap((r) => (r.id ? [{ ...r, id: r.id }] : []));
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

export function parseMarks(value: unknown): Record<string, DateAnswer> {
  const marks = record(record(value)["marks"]);
  return Object.fromEntries(
    Object.entries(marks).filter(([, v]) => isDateAnswer(v)),
  ) as Record<string, DateAnswer>;
}

export function parseBallot(value: unknown): string[] {
  return stringList(record(value)["ballot"]);
}

export function parseRsvp(value: unknown): RsvpAnswer | null {
  const v = record(value);
  const status = v["status"];
  if (!isRsvpStatus(status)) return null;
  const note = typeof v["note"] === "string" ? v["note"] : "";
  return { status, note, claims: stringList(v["claims"]) };
}

interface StoredResponse {
  blockId: string;
  participantId: string;
  value: unknown;
}

export async function listResponses(
  planId: number,
  blockId?: string,
): Promise<StoredResponse[]> {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "plan-responses",
    where: blockId
      ? {
          and: [
            { planId: { equals: planId } },
            { blockId: { equals: blockId } },
          ],
        }
      : { planId: { equals: planId } },
    limit: 0,
    pagination: false,
    depth: 0,
    select: { blockId: true, participantId: true, value: true },
    overrideAccess: true,
  });
  return docs.map((d) => ({
    blockId: d.blockId,
    participantId: d.participantId,
    value: d.value,
  }));
}

function datePollView(
  block: Extract<PlanBlock, { blockType: "datePoll" }> & { id: string },
  responses: StoredResponse[],
): DatePollView {
  const dates = withIds(block.dates).map((d) => ({
    id: d.id,
    date: d.date,
    label: d.label ?? null,
  }));
  const answers: Record<string, Record<string, DateAnswer>> = {};
  for (const r of responses) answers[r.participantId] = parseMarks(r.value);
  const { dates: tally, best } = tallyDates(
    dates.map((d) => d.id),
    Object.entries(answers).map(([participantId, marks]) => ({
      participantId,
      marks,
    })),
  );
  return {
    type: "datePoll",
    id: block.id,
    question: block.question,
    dates,
    answers,
    tally,
    best,
  };
}

function choiceVoteView(
  block: Extract<PlanBlock, { blockType: "choiceVote" }> & { id: string },
  responses: StoredResponse[],
  closed: boolean,
  now: Date,
): ChoiceVoteView {
  const options = withIds(block.options).map((o) => ({
    id: o.id,
    label: o.label,
    detail: o.detail ?? null,
  }));
  const sealed = Boolean(block.sealed);
  const revealed = isVoteRevealed(block, now);
  const voters = responses
    .filter((r) => parseBallot(r.value).length > 0)
    .map((r) => r.participantId);
  const base = {
    type: "choiceVote" as const,
    id: block.id,
    question: block.question,
    mode: block.mode,
    options,
    sealed,
    revealAt: block.revealAt ?? null,
    revealLabel: block.revealAt ? formatMoment(block.revealAt) : null,
    revealed,
    open: !closed && (!sealed || !revealed),
    voters,
  };
  if (!revealed) return { ...base, ballots: null, tally: null };

  const ballots: Record<string, string[]> = {};
  for (const r of responses) {
    const ballot = parseBallot(r.value);
    if (ballot.length > 0) ballots[r.participantId] = ballot;
  }
  return {
    ...base,
    ballots,
    tally: tallyVotes(
      options.map((o) => o.id),
      block.mode,
      Object.values(ballots),
    ),
  };
}

function rsvpView(
  block: Extract<PlanBlock, { blockType: "rsvp" }> & { id: string },
  responses: StoredResponse[],
): RsvpView {
  const answers: Record<string, RsvpAnswer> = {};
  for (const r of responses) {
    const answer = parseRsvp(r.value);
    if (answer) answers[r.participantId] = answer;
  }
  return {
    type: "rsvp",
    id: block.id,
    question: block.question,
    items: withIds(block.items).map((i) => ({
      id: i.id,
      name: i.name,
      note: i.note ?? null,
    })),
    answers,
  };
}

/** Everything the plan page shows, with sealed ballots already removed. */
export async function getPlanView(
  plan: Plan,
  now = new Date(),
): Promise<PlanView> {
  const people = planPeople(plan);
  const known = new Set(people.map((p) => p.id));
  const responses = (await listResponses(plan.id)).filter((r) =>
    known.has(r.participantId),
  );
  const forBlock = (id: string) => responses.filter((r) => r.blockId === id);
  const closed = Boolean(plan.closed);

  const blocks = withIds(plan.blocks).map((block): PlanBlockView => {
    switch (block.blockType) {
      case "datePoll":
        return datePollView(block, forBlock(block.id));
      case "choiceVote":
        return choiceVoteView(block, forBlock(block.id), closed, now);
      case "rsvp":
        return rsvpView(block, forBlock(block.id));
      case "notes":
        return {
          type: "notes",
          id: block.id,
          heading: block.heading ?? null,
          body: block.body,
        };
    }
  });

  return {
    slug: plan.shareSlug ?? "",
    title: plan.title,
    intro: plan.intro ?? null,
    closed,
    people,
    blocks,
  };
}
