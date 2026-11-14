import config from "@payload-config";
import { getPayload } from "payload";

import type { SplitGroup } from "@/payload-types";
import {
  balances,
  currencyDigits,
  expenseShares,
  settleUp,
  type Payment,
  type SplitShare,
} from "@/lib/split-math";
import { looksLikeToken } from "@/lib/tokens";

/** Server side of the cost splitter. The share slug is the only key. */

export interface SplitPerson {
  id: string;
  name: string;
}

export interface SplitExpenseView {
  id: number;
  description: string;
  amount: number;
  paidBy: string;
  splitMode: "equal" | "shares";
  shares: SplitShare[];
  spentOn: string;
  /** personId → minor units owed for this expense. */
  owed: Record<string, number>;
}

export interface SplitView {
  slug: string;
  name: string;
  currency: string;
  digits: number;
  people: SplitPerson[];
  expenses: SplitExpenseView[];
  balances: { personId: string; amount: number }[];
  payments: Payment[];
  total: number;
}

export async function findGroup(slug: string): Promise<SplitGroup | null> {
  if (!looksLikeToken(slug)) return null;
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "split-groups",
    where: { shareSlug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return docs[0] ?? null;
}

export function groupPeople(group: SplitGroup): SplitPerson[] {
  return (group.people ?? []).flatMap((p) =>
    p.id ? [{ id: p.id, name: p.name }] : [],
  );
}

/** Stored shares, cleaned: known people with a positive weight only. */
export function parseShares(value: unknown, known: Set<string>): SplitShare[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw: unknown) => {
    if (!raw || typeof raw !== "object") return [];
    const { personId, weight } = raw as Record<string, unknown>;
    if (typeof personId !== "string" || !known.has(personId)) return [];
    if (typeof weight !== "number" || weight <= 0 || Number.isNaN(weight))
      return [];
    return [{ personId, weight }];
  });
}

export async function countExpenses(groupId: number): Promise<number> {
  const payload = await getPayload({ config });
  const { totalDocs } = await payload.count({
    collection: "split-expenses",
    where: { groupId: { equals: groupId } },
    overrideAccess: true,
  });
  return totalDocs;
}

export async function getSplitView(group: SplitGroup): Promise<SplitView> {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "split-expenses",
    where: { groupId: { equals: group.id } },
    sort: ["-spentOn", "-createdAt"],
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });

  const people = groupPeople(group);
  const known = new Set(people.map((p) => p.id));
  const expenses: SplitExpenseView[] = docs.flatMap((doc) => {
    const shares = parseShares(doc.shares, known);
    if (shares.length === 0 || !known.has(doc.paidBy)) return [];
    if (!Number.isSafeInteger(doc.amount) || doc.amount <= 0) return [];
    const owed = Object.fromEntries(
      expenseShares({ amount: doc.amount, paidBy: doc.paidBy, shares }),
    );
    return [
      {
        id: doc.id,
        description: doc.description,
        amount: doc.amount,
        paidBy: doc.paidBy,
        splitMode: doc.splitMode,
        shares,
        spentOn: doc.spentOn,
        owed,
      },
    ];
  });

  const balance = balances(
    people.map((p) => p.id),
    expenses,
  );
  return {
    slug: group.shareSlug ?? "",
    name: group.name,
    currency: group.currency,
    digits: currencyDigits(group.currency),
    people,
    expenses,
    balances: [...balance].map(([personId, amount]) => ({ personId, amount })),
    payments: settleUp(balance),
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
  };
}
