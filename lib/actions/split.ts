"use server";

import config from "@payload-config";
import { revalidatePath } from "next/cache";
import { getPayload } from "payload";

import { overRateLimit } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site-url";
import { countExpenses, findGroup, groupPeople } from "@/lib/split";
import { currencyDigits, parseAmount } from "@/lib/split-math";
import {
  isSplitCurrency,
  SPLIT_MAX_AMOUNT,
  SPLIT_MAX_EXPENSES,
  SPLIT_MAX_PEOPLE,
  SPLIT_MAX_WEIGHT,
} from "@/lib/split-options";

const HOUR_MS = 60 * 60 * 1000;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function cleanNames(raw: string[]): string[] {
  const seen = new Set<string>();
  return raw
    .map((n) => n.trim().slice(0, 40))
    .filter((n) => {
      const k = n.toLowerCase();
      if (!n || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/** Inputs come from the browser: never trust their runtime types. */
function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export interface CreateGroupState {
  error?: string;
  link?: string;
  path?: string;
}

/** Public: starts a new group from /tools/split. Rate limited per visitor. */
export async function createSplitGroup(
  _prev: CreateGroupState,
  formData: FormData,
): Promise<CreateGroupState> {
  // Honeypot: bots fill every field.
  if (text(formData, "website") !== "")
    return { error: "Couldn't create that." };

  const name = text(formData, "name").slice(0, 80);
  if (!name) return { error: "Give the group a name." };
  const currency = text(formData, "currency");
  if (!isSplitCurrency(currency)) return { error: "Pick a currency." };
  const people = cleanNames(
    formData.getAll("person").filter((v): v is string => typeof v === "string"),
  );
  if (people.length < 2) return { error: "Add at least two people." };
  if (people.length > SPLIT_MAX_PEOPLE) {
    return { error: `Up to ${String(SPLIT_MAX_PEOPLE)} people per group.` };
  }

  const payload = await getPayload({ config });
  if (await overRateLimit(payload, "split-create", 10, HOUR_MS)) {
    return { error: "Too many new groups from here. Try again in an hour." };
  }
  try {
    const group = await payload.create({
      collection: "split-groups",
      data: { name, currency, people: people.map((n) => ({ name: n })) },
      overrideAccess: true,
    });
    const path = `/split/${group.shareSlug ?? ""}`;
    return { link: `${siteUrl()}${path}`, path };
  } catch (err) {
    console.error(err);
    return { error: "Couldn't create the group. Try again." };
  }
}

export type SplitActionResult =
  { ok: true; message: string } | { error: string };

export interface ExpenseInput {
  slug: string;
  description: string;
  amount: string;
  paidBy: string;
  splitMode: "equal" | "shares";
  /** personId → weight (equal mode: any positive number). */
  shares: Record<string, unknown>;
  spentOn: string;
}

/** Anyone with the link: adds an expense. */
export async function addExpense(
  input: ExpenseInput,
): Promise<SplitActionResult> {
  const group = await findGroup(asText(input.slug));
  if (!group) return { error: "This group doesn't exist." };
  const known = new Set(groupPeople(group).map((p) => p.id));

  const description = asText(input.description).trim().slice(0, 120);
  if (!description) return { error: "Say what it was for." };
  const amount = parseAmount(
    asText(input.amount),
    currencyDigits(group.currency),
  );
  if (amount === null) return { error: "Enter an amount greater than zero." };
  if (amount > SPLIT_MAX_AMOUNT) return { error: "That amount is too large." };
  if (!known.has(input.paidBy)) return { error: "Pick who paid." };
  const mode = input.splitMode === "shares" ? "shares" : "equal";

  const shares = Object.entries(input.shares).flatMap(([personId, raw]) => {
    if (!known.has(personId)) return [];
    const weight = mode === "equal" ? 1 : Math.round(Number(raw) * 100) / 100;
    return Number.isFinite(weight) && weight > 0 && weight <= SPLIT_MAX_WEIGHT
      ? [{ personId, weight }]
      : [];
  });
  if (shares.length === 0) return { error: "Pick who it's split between." };

  const day = /^\d{4}-\d{2}-\d{2}$/.test(input.spentOn)
    ? new Date(`${input.spentOn}T12:00:00.000Z`)
    : new Date();
  if (Number.isNaN(day.getTime())) return { error: "Pick a valid date." };

  if ((await countExpenses(group.id)) >= SPLIT_MAX_EXPENSES) {
    return { error: "This group has reached its expense limit." };
  }

  try {
    const payload = await getPayload({ config });
    await payload.create({
      collection: "split-expenses",
      data: {
        groupId: group.id,
        description,
        amount,
        paidBy: input.paidBy,
        splitMode: mode,
        shares,
        spentOn: day.toISOString(),
      },
      overrideAccess: true,
    });
  } catch (err) {
    console.error(err);
    return { error: "Couldn't save that. Try again." };
  }
  revalidatePath(`/split/${group.shareSlug ?? ""}`);
  return { ok: true, message: `Added “${description}”.` };
}

/** Anyone with the link: removes one expense from this group. */
export async function deleteExpense(
  slug: string,
  expenseId: number,
): Promise<SplitActionResult> {
  const group = await findGroup(asText(slug));
  if (!group || !Number.isInteger(expenseId)) {
    return { error: "That expense doesn't exist." };
  }
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "split-expenses",
    where: {
      and: [{ id: { equals: expenseId } }, { groupId: { equals: group.id } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const expense = docs[0];
  if (!expense) return { error: "That expense doesn't exist." };
  await payload.delete({
    collection: "split-expenses",
    id: expense.id,
    overrideAccess: true,
  });
  revalidatePath(`/split/${group.shareSlug ?? ""}`);
  return { ok: true, message: `Deleted “${expense.description}”.` };
}

/** Anyone with the link: adds a person to the group. */
export async function addPerson(
  slug: string,
  rawName: string,
): Promise<SplitActionResult> {
  const group = await findGroup(asText(slug));
  if (!group) return { error: "This group doesn't exist." };
  const name = asText(rawName).trim().slice(0, 40);
  if (!name) return { error: "Enter a name." };
  const people = group.people ?? [];
  if (people.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return { error: `${name} is already in the group.` };
  }
  if (people.length >= SPLIT_MAX_PEOPLE) {
    return { error: `Up to ${String(SPLIT_MAX_PEOPLE)} people per group.` };
  }
  const payload = await getPayload({ config });
  await payload.update({
    collection: "split-groups",
    id: group.id,
    data: { people: [...people, { name }] },
    overrideAccess: true,
  });
  revalidatePath(`/split/${group.shareSlug ?? ""}`);
  return { ok: true, message: `Added ${name}.` };
}
