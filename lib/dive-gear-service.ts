import type { DataFromCollectionSlug } from "payload";

export type DiveGearDoc = DataFromCollectionSlug<"dive-gear">;

export type ServiceStatus = "ok" | "due-soon" | "overdue" | null;

const DUE_SOON_DAYS = 30;

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/**
 * Prefers the most recent serviceLog entry + serviceIntervalMonths; falls
 * back to the legacy manually-entered nextServiceDue field so gear added
 * before serviceLog existed keeps working without a data migration.
 */
export function nextServiceDueDate(item: DiveGearDoc): Date | null {
  const log = item.serviceLog ?? [];
  const interval = item.serviceIntervalMonths;

  if (log.length > 0 && typeof interval === "number") {
    let mostRecentDate: Date | null = null;
    for (const entry of log) {
      const entryDate = new Date(entry.date);
      if (!mostRecentDate || entryDate > mostRecentDate) {
        mostRecentDate = entryDate;
      }
    }
    if (mostRecentDate) return addMonths(mostRecentDate, interval);
  }

  return item.nextServiceDue ? new Date(item.nextServiceDue) : null;
}

export function serviceStatus(item: DiveGearDoc): ServiceStatus {
  const due = nextServiceDueDate(item);
  if (!due) return null;

  const daysUntilDue = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= DUE_SOON_DAYS) return "due-soon";
  return "ok";
}
