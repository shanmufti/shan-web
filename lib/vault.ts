/**
 * Pure vault helpers: categories, date maths, renewals and cost totals.
 * No Payload imports, so collections and tests can use it.
 *
 * Dates are compared as UTC calendar days ("YYYY-MM-DD"). Payload stores
 * day-only dates at noon UTC, so the UTC day is the day that was picked.
 */

export const VAULT_CATEGORIES = [
  "document",
  "subscription",
  "insurance",
  "domain",
  "certification",
  "membership",
  "other",
] as const;
export type VaultCategory = (typeof VAULT_CATEGORIES)[number];

export const VAULT_CATEGORY_LABELS: Record<VaultCategory, string> = {
  document: "Document",
  subscription: "Subscription",
  insurance: "Insurance",
  domain: "Domain",
  certification: "Certification",
  membership: "Membership",
  other: "Other",
};

export function isVaultCategory(value: unknown): value is VaultCategory {
  return (
    typeof value === "string" &&
    (VAULT_CATEGORIES as readonly string[]).includes(value)
  );
}

export const BILLING_PERIODS = ["monthly", "yearly", "one-off"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

/** The fields these helpers need from a vault record. */
export interface VaultRecordLike {
  id: number | string;
  title: string;
  category?: string | null;
  provider?: string | null;
  cost?: number | null;
  currency?: string | null;
  billingPeriod?: string | null;
  renewalDate?: string | null;
  expiryDate?: string | null;
  autoRenews?: boolean | null;
  reminderLeadDays?: number | null;
  archived?: boolean | null;
}

export type VaultEventKind = "renewal" | "expiry";

export interface VaultEvent {
  record: VaultRecordLike;
  kind: VaultEventKind;
  /** "YYYY-MM-DD" */
  date: string;
  /** Negative when overdue. */
  daysAway: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_LEAD_DAYS = 30;
interface VaultFileNames {
  id: number | string;
  filename?: string | null;
  originalFilename?: string | null;
  title?: string | null;
}

/** The name a vault file was uploaded with (stored names are random). */
export function vaultFileName(file: VaultFileNames): string {
  return file.originalFilename ?? file.filename ?? `File ${String(file.id)}`;
}

/** Title if set, otherwise the original name. */
export function vaultFileLabel(file: VaultFileNames): string {
  return file.title ?? vaultFileName(file);
}

/** Owner-only download with the original file name. */
export function vaultFileHref(file: VaultFileNames): string {
  return `/vault/files/${String(file.id)}/download`;
}

/** Key prefix for vault files in the R2 bucket. */
export const VAULT_R2_PREFIX = "vault";
export const UPCOMING_WINDOW_DAYS = 60;

/** "YYYY-MM-DD" (UTC) for an ISO timestamp or Date, or null. */
export function dayKey(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseDay(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (parseDay(to).getTime() - parseDay(from).getTime()) / DAY_MS,
  );
}

export function addDays(key: string, days: number): string {
  return new Date(parseDay(key).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Adds months, clamping to the end of shorter months (Jan 31 → Feb 28). */
export function addMonths(key: string, months: number): string {
  const date = parseDay(key);
  const day = date.getUTCDate();
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

function isRecurring(period: string | null | undefined): boolean {
  return period === "monthly" || period === "yearly";
}

/**
 * Next renewal on or after `today`. Auto-renewing monthly/yearly records roll
 * forward from the saved date, so they never show as overdue.
 */
export function nextRenewal(
  record: VaultRecordLike,
  today: string,
): string | null {
  const start = dayKey(record.renewalDate);
  if (!start) return null;
  if (!record.autoRenews || !isRecurring(record.billingPeriod)) return start;
  const step = record.billingPeriod === "monthly" ? 1 : 12;
  let next = start;
  let n = 0;
  // Bounded loop: at most ~100 years of monthly renewals.
  while (next < today && n < 1200) {
    n += step;
    next = addMonths(start, n);
  }
  return next;
}

/** Renewal and expiry dates for one record (archived records have none). */
export function recordEvents(
  record: VaultRecordLike,
  today: string,
): VaultEvent[] {
  if (record.archived) return [];
  const events: VaultEvent[] = [];
  const renewal = nextRenewal(record, today);
  if (renewal) {
    events.push({
      record,
      kind: "renewal",
      date: renewal,
      daysAway: daysBetween(today, renewal),
    });
  }
  const expiry = dayKey(record.expiryDate);
  if (expiry) {
    events.push({
      record,
      kind: "expiry",
      date: expiry,
      daysAway: daysBetween(today, expiry),
    });
  }
  return events;
}

export function allEvents(
  records: VaultRecordLike[],
  today: string,
): VaultEvent[] {
  return records
    .flatMap((r) => recordEvents(r, today))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function upcomingEvents(
  records: VaultRecordLike[],
  today: string,
  windowDays = UPCOMING_WINDOW_DAYS,
): VaultEvent[] {
  return allEvents(records, today).filter(
    (e) => e.daysAway >= 0 && e.daysAway <= windowDays,
  );
}

export function overdueEvents(
  records: VaultRecordLike[],
  today: string,
): VaultEvent[] {
  return allEvents(records, today).filter((e) => e.daysAway < 0);
}

/** Cost per month for a record, or null if it isn't a recurring cost. */
export function monthlyCost(record: VaultRecordLike): number | null {
  if (record.archived || typeof record.cost !== "number") return null;
  if (record.billingPeriod === "monthly") return record.cost;
  if (record.billingPeriod === "yearly") return record.cost / 12;
  return null;
}

/**
 * Monthly totals per currency, largest first. Leaves out archived records
 * and ones whose expiry date has passed.
 */
export function monthlyTotals(
  records: VaultRecordLike[],
  today: string,
): { currency: string; amount: number; count: number }[] {
  const totals = new Map<string, { amount: number; count: number }>();
  for (const record of records) {
    const expiry = dayKey(record.expiryDate);
    if (expiry && expiry < today) continue;
    const amount = monthlyCost(record);
    if (amount === null) continue;
    const currency = (record.currency ?? "USD").toUpperCase();
    const entry = totals.get(currency) ?? { amount: 0, count: 0 };
    entry.amount += amount;
    entry.count += 1;
    totals.set(currency, entry);
  }
  return [...totals.entries()]
    .map(([currency, v]) => ({ currency, ...v }))
    .sort((a, b) => b.amount - a.amount);
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDay(key: string): string {
  return parseDay(key).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "in 12 days", "today", "3 days ago". */
export function relativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${String(days)} days` : `${String(-days)} days ago`;
}

export function eventLabel(kind: VaultEventKind): string {
  return kind === "renewal" ? "Renews" : "Expires";
}
