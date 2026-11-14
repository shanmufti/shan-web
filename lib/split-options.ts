/** Cost splitter limits and choices. Pure data, safe to import anywhere. */

export const SPLIT_CURRENCIES = [
  "USD",
  "CAD",
  "EUR",
  "GBP",
  "AUD",
  "NZD",
  "JPY",
  "MXN",
  "CHF",
  "SGD",
  "HKD",
  "INR",
  "PKR",
  "THB",
  "IDR",
  "PHP",
  "AED",
] as const;

export type SplitCurrency = (typeof SPLIT_CURRENCIES)[number];

export function isSplitCurrency(value: unknown): value is SplitCurrency {
  return (
    typeof value === "string" &&
    (SPLIT_CURRENCIES as readonly string[]).includes(value)
  );
}

export const SPLIT_MAX_PEOPLE = 30;
export const SPLIT_MAX_EXPENSES = 500;
/** Largest single expense in minor units (keeps the maths in safe integers). */
export const SPLIT_MAX_AMOUNT = 1_000_000_000;
export const SPLIT_MAX_WEIGHT = 1000;
