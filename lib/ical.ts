/**
 * Minimal RFC 5545 writer for the vault calendar feed: all-day events with a
 * display alarm. Lines end in CRLF and are folded at 75 octets.
 */

import {
  addDays,
  DEFAULT_LEAD_DAYS,
  type VaultEvent,
  VAULT_CATEGORY_LABELS,
  isVaultCategory,
} from "@/lib/vault";

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds one content line to 75-octet chunks without splitting a character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    // Continuation lines start with a space, which counts toward the 75.
    const limit = parts.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function compactDay(key: string): string {
  return key.replace(/-/g, "");
}

function utcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export interface CalendarOptions {
  /** Site origin, for UIDs and record links. */
  origin: string;
  now?: Date;
}

export function buildVaultCalendar(
  events: VaultEvent[],
  { origin, now = new Date() }: CalendarOptions,
): string {
  const host = new URL(origin).hostname;
  const stamp = utcStamp(now);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${host}//Vault//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Vault renewals",
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
  ];

  for (const event of events) {
    const { record, kind, date } = event;
    const lead = Math.max(0, record.reminderLeadDays ?? DEFAULT_LEAD_DAYS);
    const verb = kind === "renewal" ? "Renews" : "Expires";
    const summary = `${verb}: ${record.title}`;
    const url = `${origin}/vault/records/${String(record.id)}`;
    const details = [
      isVaultCategory(record.category)
        ? VAULT_CATEGORY_LABELS[record.category]
        : null,
      record.provider ?? null,
      url,
    ].filter(Boolean);

    lines.push(
      "BEGIN:VEVENT",
      `UID:vault-${String(record.id)}-${kind}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDay(date)}`,
      `DTEND;VALUE=DATE:${compactDay(addDays(date, 1))}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(details.join("\n"))}`,
      `URL:${url}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(summary)}`,
      lead === 0 ? "TRIGGER:PT0S" : `TRIGGER:-P${String(lead)}D`,
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
