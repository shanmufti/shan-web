import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { adminLinkClass, VaultSubnav } from "@/components/vault-subnav";
import { formatBytes } from "@/lib/format-bytes";
import {
  dayKey,
  formatDay,
  formatMoney,
  monthlyCost,
  nextRenewal,
  recordEvents,
  relativeDays,
  VAULT_CATEGORY_LABELS,
} from "@/lib/vault";
import { getVaultRecord, type VaultRecord } from "@/lib/vault-data";

export const metadata: Metadata = { title: "Record" };

function Row({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="border-border grid gap-1 border-b py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

function dayOrDash(iso: string | null | undefined): string {
  const key = dayKey(iso);
  return key ? formatDay(key) : "–";
}

const PERIOD_LABELS: Record<string, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
  "one-off": "One-off",
};

/** "$120.00 · Yearly ($10.00/mo)" */
function costText(record: VaultRecord): string {
  if (typeof record.cost !== "number") return "–";
  const currency = record.currency ?? "USD";
  const parts = [formatMoney(record.cost, currency)];
  if (record.billingPeriod) {
    parts.push(PERIOD_LABELS[record.billingPeriod] ?? record.billingPeriod);
  }
  const monthly = monthlyCost(record);
  const perMonth =
    monthly !== null && record.billingPeriod === "yearly"
      ? ` (${formatMoney(monthly, currency)}/mo)`
      : "";
  return parts.join(" · ") + perMonth;
}

export default async function VaultRecordPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const record = await getVaultRecord(id);
  if (!record) notFound();

  const today = dayKey(new Date()) ?? "";
  const events = recordEvents(record, today);
  const renewal = nextRenewal(record, today);
  const files = (record.attachments ?? []).filter(
    (f): f is Exclude<typeof f, number> => typeof f === "object",
  );

  return (
    <>
      <header className="pt-16 pb-8 sm:pt-24">
        <p className="meta-label text-muted-foreground">
          {VAULT_CATEGORY_LABELS[record.category]}
          {record.archived ? " · Archived" : ""}
        </p>
        <h1 className="font-heading mt-3 text-[clamp(2rem,4vw,3rem)] break-words">
          {record.title}
        </h1>
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link
            href={`/admin/collections/vault-records/${String(record.id)}`}
            className={adminLinkClass}
          >
            Edit in admin
          </Link>
          <Link href="/vault" className={adminLinkClass}>
            Back to vault
          </Link>
        </p>
        <VaultSubnav />
      </header>

      {events.length > 0 ? (
        <ul className="mb-8 flex flex-wrap gap-3">
          {events.map((e) => (
            <li
              key={e.kind}
              className="border-border bg-card rounded-lg border px-4 py-3 text-sm"
            >
              <span className="text-muted-foreground">
                {e.kind === "renewal" ? "Next renewal" : "Expires"}
              </span>{" "}
              <span className="font-medium">{formatDay(e.date)}</span>{" "}
              <span
                className={
                  e.daysAway < 0 ? "text-destructive" : "text-muted-foreground"
                }
              >
                ({relativeDays(e.daysAway)})
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="border-border max-w-3xl border-t">
        <Row label="Provider">{record.provider ?? "–"}</Row>
        <Row label="Reference number">
          {record.referenceNumber ? (
            <span className="font-mono">{record.referenceNumber}</span>
          ) : (
            "–"
          )}
        </Row>
        <Row label="Cost">{costText(record)}</Row>
        <Row label="Start date">{dayOrDash(record.startDate)}</Row>
        <Row label="Renewal date">
          {dayOrDash(record.renewalDate)}
          {renewal && renewal !== dayKey(record.renewalDate)
            ? ` (rolls forward to ${formatDay(renewal)})`
            : ""}
        </Row>
        <Row label="Expiry date">{dayOrDash(record.expiryDate)}</Row>
        <Row label="Auto-renews">{record.autoRenews ? "Yes" : "No"}</Row>
        <Row label="Reminder">
          {String(record.reminderLeadDays ?? 30)} days before
        </Row>
        <Row label="Notes">
          {record.notes ? (
            <span className="whitespace-pre-line">{record.notes}</span>
          ) : (
            "–"
          )}
        </Row>
        <Row label="Attachments">
          {files.length > 0 ? (
            <ul className="space-y-1">
              {files.map((file) => (
                <li key={file.id}>
                  {file.url ? (
                    <a
                      href={file.url}
                      className="underline underline-offset-4"
                      download
                    >
                      {file.title ?? file.filename}
                    </a>
                  ) : (
                    (file.title ?? file.filename)
                  )}
                  {typeof file.filesize === "number" ? (
                    <span className="text-muted-foreground ml-2">
                      {formatBytes(file.filesize)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            "–"
          )}
        </Row>
      </dl>
    </>
  );
}
