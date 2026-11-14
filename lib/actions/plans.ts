"use server";

import config from "@payload-config";
import { revalidatePath } from "next/cache";
import { getPayload } from "payload";

import { isDateAnswer, isRsvpStatus, isVoteRevealed } from "@/lib/plan-tally";
import {
  findPlan,
  listResponses,
  parseRsvp,
  planPeople,
  type PlanBlock,
} from "@/lib/plans";

export interface PlanResponseInput {
  slug: string;
  participantId: string;
  blockId: string;
  value: unknown;
}

/** Inputs come from the browser: never trust their runtime types. */
function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export type PlanResponseResult = { ok: true } | { error: string };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

type Checked = { value: Record<string, unknown> } | { error: string };

function checkDatePoll(
  block: Extract<PlanBlock, { blockType: "datePoll" }>,
  raw: Record<string, unknown>,
): Checked {
  const ids = new Set((block.dates ?? []).map((d) => d.id));
  const marks = record(raw["marks"]);
  const clean: Record<string, string> = {};
  for (const [dateId, answer] of Object.entries(marks)) {
    if (ids.has(dateId) && isDateAnswer(answer)) clean[dateId] = answer;
  }
  if (Object.keys(clean).length === 0) {
    return { error: "Mark at least one date." };
  }
  return { value: { marks: clean } };
}

function checkChoiceVote(
  block: Extract<PlanBlock, { blockType: "choiceVote" }>,
  raw: Record<string, unknown>,
): Checked {
  if (block.sealed && isVoteRevealed(block)) {
    return { error: "This vote has been revealed, so voting is closed." };
  }
  const ids = new Set((block.options ?? []).map((o) => o.id));
  const ballot = Array.isArray(raw["ballot"]) ? raw["ballot"] : [];
  const picks = [
    ...new Set(
      ballot.filter((v): v is string => typeof v === "string" && ids.has(v)),
    ),
  ];
  const max = block.mode === "ranked" ? Math.min(3, ids.size) : 1;
  if (picks.length === 0) return { error: "Pick an option." };
  if (picks.length > max) return { error: "Too many picks." };
  if (picks.length !== ballot.length) {
    return { error: "Each pick has to be a different option." };
  }
  return { value: { ballot: picks } };
}

async function checkRsvp(
  block: Extract<PlanBlock, { blockType: "rsvp" }> & { id: string },
  raw: Record<string, unknown>,
  planId: number,
  participantId: string,
  names: Map<string, string>,
): Promise<Checked> {
  const status = raw["status"];
  if (!isRsvpStatus(status)) return { error: "Say whether you're coming." };
  const note =
    typeof raw["note"] === "string" ? raw["note"].trim().slice(0, 300) : "";
  const items = new Map((block.items ?? []).map((i) => [i.id, i.name]));
  const claims = Array.isArray(raw["claims"])
    ? [
        ...new Set(
          raw["claims"].filter(
            (v): v is string => typeof v === "string" && items.has(v),
          ),
        ),
      ]
    : [];
  // Not coming: let go of anything claimed.
  const finalClaims = status === "no" ? [] : claims;

  const others = await listResponses(planId, block.id);
  for (const other of others) {
    if (other.participantId === participantId) continue;
    if (!names.has(other.participantId)) continue;
    const answer = parseRsvp(other.value);
    const taken = answer?.claims.find((c) => finalClaims.includes(c));
    if (taken) {
      return {
        error: `${names.get(other.participantId) ?? "Someone"} is already bringing ${items.get(taken) ?? "that"}.`,
      };
    }
  }
  return { value: { status, note, claims: finalClaims } };
}

/** Saves one person's answer to one block of a plan (insert or replace). */
export async function savePlanResponse(
  input: PlanResponseInput,
): Promise<PlanResponseResult> {
  const plan = await findPlan(asText(input.slug));
  if (!plan) return { error: "This plan doesn't exist." };
  if (plan.closed) return { error: "This plan is closed." };

  const people = planPeople(plan);
  const person = people.find((p) => p.id === input.participantId);
  if (!person) return { error: "Pick your name first." };
  const block = (plan.blocks ?? []).find((b) => b.id === input.blockId);
  if (!block?.id) return { error: "That section no longer exists." };

  const raw = record(input.value);
  let checked: Checked;
  switch (block.blockType) {
    case "datePoll":
      checked = checkDatePoll(block, raw);
      break;
    case "choiceVote":
      checked = checkChoiceVote(block, raw);
      break;
    case "rsvp":
      checked = await checkRsvp(
        { ...block, id: block.id },
        raw,
        plan.id,
        person.id,
        new Map(people.map((p) => [p.id, p.name])),
      );
      break;
    case "notes":
      checked = { error: "Notes can't be answered." };
      break;
  }
  if ("error" in checked) return checked;

  const key = `${String(plan.id)}:${block.id}:${person.id}`;
  const data = {
    key,
    planId: plan.id,
    blockId: block.id,
    participantId: person.id,
    name: person.name,
    value: checked.value,
  };

  try {
    const payload = await getPayload({ config });
    const upsert = async () => {
      const { docs } = await payload.find({
        collection: "plan-responses",
        where: { key: { equals: key } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      const prior = docs[0];
      if (prior) {
        await payload.update({
          collection: "plan-responses",
          id: prior.id,
          data,
          overrideAccess: true,
        });
      } else {
        await payload.create({
          collection: "plan-responses",
          data,
          overrideAccess: true,
        });
      }
    };
    try {
      await upsert();
    } catch {
      // Two saves at once can race on the unique key; the retry updates.
      await upsert();
    }
  } catch (err) {
    console.error(err);
    return { error: "Couldn't save that. Try again in a moment." };
  }

  revalidatePath(`/plans/${String(plan.shareSlug)}`);
  return { ok: true };
}
