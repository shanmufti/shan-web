/**
 * Cost splitter maths. Pure functions, no imports, so the unit tests in
 * scripts/split-math.test.mjs can load this file directly.
 *
 * Every amount is an integer in the currency's minor unit (cents for USD,
 * yen for JPY), so balances always sum to exactly zero and settling up never
 * leaves a stray cent.
 */

export interface SplitShare {
  personId: string;
  /** Relative weight. Equal splits use 1 for everyone. */
  weight: number;
}

export interface SplitExpense {
  /** Integer minor units, greater than zero. */
  amount: number;
  paidBy: string;
  shares: SplitShare[];
}

export interface Payment {
  from: string;
  to: string;
  /** Integer minor units, greater than zero. */
  amount: number;
}

/** Weights are kept to 2 decimal places, then compared as integers. */
const WEIGHT_SCALE = 100;

function scaledWeight(weight: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  return Math.round(weight * WEIGHT_SCALE);
}

/**
 * Splits `amount` minor units in proportion to `weights`, using the largest
 * remainder method so the parts always add up to `amount`. Leftover units go
 * to the largest fractional remainders; ties go to the earlier entry, so the
 * result only depends on the order the people are listed in.
 */
export function allocate(amount: number, weights: number[]): number[] {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError("amount must be a non-negative integer");
  }
  const scaled = weights.map(scaledWeight);
  const total = scaled.reduce((sum, w) => sum + w, 0);
  if (total === 0) throw new RangeError("at least one weight must be > 0");

  const parts = scaled.map((w) => Math.floor((amount * w) / total));
  const remainders = scaled.map((w, index) => ({
    index,
    rest: (amount * w) % total,
  }));
  let leftover = amount - parts.reduce((sum, p) => sum + p, 0);
  remainders.sort((a, b) => b.rest - a.rest || a.index - b.index);
  for (const { index } of remainders) {
    if (leftover === 0) break;
    parts[index] = (parts[index] ?? 0) + 1;
    leftover -= 1;
  }
  return parts;
}

/** What each person owes for one expense, keyed by person id. */
export function expenseShares(expense: SplitExpense): Map<string, number> {
  const parts = allocate(
    expense.amount,
    expense.shares.map((s) => s.weight),
  );
  const owed = new Map<string, number>();
  expense.shares.forEach((share, i) => {
    owed.set(share.personId, (owed.get(share.personId) ?? 0) + (parts[i] ?? 0));
  });
  return owed;
}

/**
 * Net balance per person: what they paid minus their share of everything.
 * Positive means the group owes them; negative means they owe. Returned in
 * `personIds` order; people who never appear get 0.
 */
export function balances(
  personIds: string[],
  expenses: SplitExpense[],
): Map<string, number> {
  const result = new Map<string, number>(personIds.map((id) => [id, 0]));
  for (const expense of expenses) {
    result.set(
      expense.paidBy,
      (result.get(expense.paidBy) ?? 0) + expense.amount,
    );
    for (const [personId, owed] of expenseShares(expense)) {
      result.set(personId, (result.get(personId) ?? 0) - owed);
    }
  }
  return result;
}

/**
 * Settle-up payments by greedy minimum cash flow: the person who owes the
 * most pays the person owed the most, as much as one of them needs, until
 * everyone is square. That's at most (people − 1) payments. Ties go to
 * whoever comes first in the balances' order, so the same data always gives
 * the same list.
 */
export function settleUp(balance: Map<string, number>): Payment[] {
  const order = new Map([...balance.keys()].map((id, i) => [id, i]));
  const rank = (id: string) => order.get(id) ?? 0;
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];
  for (const [id, amount] of balance) {
    if (amount > 0) creditors.push({ id, amount });
    if (amount < 0) debtors.push({ id, amount: -amount });
  }

  const pickLargest = (list: { id: string; amount: number }[]) => {
    let best: { id: string; amount: number } | undefined;
    for (const entry of list) {
      if (entry.amount <= 0) continue;
      if (
        !best ||
        entry.amount > best.amount ||
        (entry.amount === best.amount && rank(entry.id) < rank(best.id))
      ) {
        best = entry;
      }
    }
    return best;
  };

  const payments: Payment[] = [];
  for (;;) {
    const debtor = pickLargest(debtors);
    const creditor = pickLargest(creditors);
    if (!debtor || !creditor) break;
    const amount = Math.min(debtor.amount, creditor.amount);
    payments.push({ from: debtor.id, to: creditor.id, amount });
    debtor.amount -= amount;
    creditor.amount -= amount;
  }
  return payments;
}

/** Digits after the decimal point for a currency (2 for USD, 0 for JPY). */
export function currencyDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/**
 * Parses what someone typed ("12", "12.5", "1,234.56") into minor units
 * without floating point. Returns null for anything else, including too many
 * decimals for the currency, zero and negative amounts.
 */
export function parseAmount(input: string, digits: number): number | null {
  const cleaned = input.trim().replaceAll(",", "").replaceAll(" ", "");
  const match = /^(\d{1,9})(?:\.(\d*))?$/.exec(cleaned);
  if (!match) return null;
  const whole = match[1] ?? "0";
  const fraction = match[2] ?? "";
  if (fraction.length > digits) return null;
  const minor = Number(whole + fraction.padEnd(digits, "0"));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

/** "$1,234.50", "¥1,200", "-€3.10". */
export function formatMoney(minor: number, currency: string): string {
  const digits = currencyDigits(currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(minor / 10 ** digits);
  } catch {
    return `${(minor / 10 ** digits).toFixed(digits)} ${currency}`;
  }
}
