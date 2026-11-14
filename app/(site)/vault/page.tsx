import type { Metadata } from "next";
import Link from "next/link";

import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { VaultEventList } from "@/components/vault/vault-event-list";
import { adminLinkClass, VaultSubnav } from "@/components/vault/vault-subnav";
import { siteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import {
  dayKey,
  formatDay,
  formatMoney,
  isVaultCategory,
  monthlyCost,
  monthlyTotals,
  nextRenewal,
  overdueEvents,
  upcomingEvents,
  UPCOMING_WINDOW_DAYS,
  VAULT_CATEGORIES,
  VAULT_CATEGORY_LABELS,
  type VaultCategory,
} from "@/lib/vault";
import {
  calendarToken,
  listVaultRecords,
  ownerContext,
  type VaultRecord,
} from "@/lib/vault-data";

export const metadata: Metadata = { title: { absolute: "Vault · Shan Mufti" } };

function nextDate(record: VaultRecord, today: string): string | null {
  const dates = [nextRenewal(record, today), dayKey(record.expiryDate)].filter(
    (d): d is string => d !== null && d >= today,
  );
  dates.sort((a, b) => a.localeCompare(b));
  return dates[0] ?? null;
}

function Stat({
  label,
  children,
  tone,
}: Readonly<{
  label: string;
  children: React.ReactNode;
  tone?: "warn" | undefined;
}>) {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <dt className="meta-label text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-2 text-2xl font-medium tabular-nums",
          tone === "warn" ? "text-destructive" : undefined,
        )}
      >
        {children}
      </dd>
    </div>
  );
}

const QUICK_LINKS = [
  { href: "/admin/collections/vault-records/create", label: "New record" },
  { href: "/admin/collections/vault-files/create", label: "Upload a file" },
  { href: "/vault/drops", label: "Share a file" },
  { href: "/admin/collections/snippets/create", label: "New snippet" },
  { href: "/admin/globals/vault-settings", label: "Vault settings" },
];

export default async function VaultPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { category: raw } = await searchParams;
  const category: VaultCategory | null = isVaultCategory(raw) ? raw : null;
  const { payload } = await ownerContext();
  const [records, token] = await Promise.all([
    listVaultRecords(),
    calendarToken(payload),
  ]);
  const today = dayKey(new Date()) ?? "";
  const upcoming = upcomingEvents(records, today);
  const overdue = overdueEvents(records, today);
  const totals = monthlyTotals(records, today);
  const feedUrl = `${siteUrl()}/vault/calendar.ics?token=${token}`;
  const shown = category
    ? records.filter((r) => r.category === category)
    : records;
  const counts = new Map<string, number>();
  for (const r of records)
    counts.set(r.category, (counts.get(r.category) ?? 0) + 1);

  return (
    <>
      <PageHeader eyebrow="Private" title="Vault">
        <VaultSubnav current="/vault" />
      </PageHeader>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Overdue" tone={overdue.length > 0 ? "warn" : undefined}>
          {overdue.length}
        </Stat>
        <Stat label={`Next ${String(UPCOMING_WINDOW_DAYS)} days`}>
          {upcoming.length}
        </Stat>
        <Stat label="Monthly cost">
          {totals.length === 0 ? (
            "–"
          ) : (
            <span className="flex flex-col gap-0.5">
              {totals.map((t) => (
                <span key={t.currency}>
                  {formatMoney(t.amount, t.currency)}
                </span>
              ))}
            </span>
          )}
        </Stat>
        <Stat label="Records">{records.length}</Stat>
      </dl>
      <p className="text-muted-foreground mt-2 text-xs">
        Monthly cost counts monthly and yearly (÷ 12) records that aren&apos;t
        archived or expired. One-off costs are left out.
      </p>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-10">
          {overdue.length > 0 ? (
            <section aria-labelledby="overdue-heading">
              <h2
                id="overdue-heading"
                className="text-destructive text-lg font-medium"
              >
                Overdue
              </h2>
              <VaultEventList events={overdue} />
            </section>
          ) : null}
          <section aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="text-lg font-medium">
              Coming up in the next {UPCOMING_WINDOW_DAYS} days
            </h2>
            {upcoming.length > 0 ? (
              <VaultEventList events={upcoming} />
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                Nothing renews or expires in the next {UPCOMING_WINDOW_DAYS}{" "}
                days.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-8">
          <section aria-labelledby="quick-heading">
            <h2 id="quick-heading" className="text-lg font-medium">
              Quick links
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={adminLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="feed-heading">
            <h2 id="feed-heading" className="text-lg font-medium">
              Calendar feed
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Subscribe to this link in your phone&apos;s calendar for renewal
              and expiry reminders. Anyone with the link can read titles and
              dates.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CopyButton text={feedUrl} label="calendar feed link">
                Copy feed link
              </CopyButton>
              <a
                href={feedUrl.replace(/^https?:/, "webcal:")}
                className={cn(adminLinkClass, "text-xs")}
              >
                Open in calendar
              </a>
            </div>
          </section>
        </aside>
      </div>

      <section aria-labelledby="records-heading" className="mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="records-heading" className="text-lg font-medium">
            Records
          </h2>
          <Link
            href="/admin/collections/vault-records/create"
            className={cn(adminLinkClass, "text-sm")}
          >
            New record
          </Link>
        </div>
        <nav aria-label="Filter records by category" className="mt-4">
          <ul className="flex flex-wrap gap-2">
            {[null, ...VAULT_CATEGORIES].map((key) => {
              const active = key === category;
              const count = key ? (counts.get(key) ?? 0) : records.length;
              if (key && count === 0) return null;
              return (
                <li key={key ?? "all"}>
                  <Link
                    href={key ? `/vault?category=${key}` : "/vault"}
                    scroll={false}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-visible:ring-ring/50 inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-sm outline-none focus-visible:ring-3",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {key ? VAULT_CATEGORY_LABELS[key] : "All"}
                    <span className="tabular-nums opacity-70">{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {shown.length > 0 ? (
          <ul className="divide-border border-border mt-6 divide-y border-y">
            {shown.map((record) => {
              const next = nextDate(record, today);
              const monthly = monthlyCost(record);
              return (
                <li key={record.id}>
                  <Link
                    href={`/vault/records/${String(record.id)}`}
                    className="hover:bg-muted/60 focus-visible:ring-ring/50 grid gap-1 px-2 py-3 outline-none focus-visible:ring-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-baseline sm:gap-4"
                  >
                    <span className="font-medium">
                      {record.title}
                      {record.archived ? (
                        <span className="text-muted-foreground ml-2 text-xs font-normal">
                          Archived
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {VAULT_CATEGORY_LABELS[record.category]}
                      {record.provider ? ` · ${record.provider}` : ""}
                    </span>
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {next ? `Next: ${formatDay(next)}` : "No upcoming date"}
                    </span>
                    <span className="text-muted-foreground text-sm tabular-nums sm:text-right">
                      {monthly === null
                        ? ""
                        : `${formatMoney(monthly, record.currency ?? "USD")}/mo`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground mt-6 text-sm">
            No records yet.{" "}
            <Link
              href="/admin/collections/vault-records/create"
              className="underline underline-offset-4"
            >
              Add the first one
            </Link>
            .
          </p>
        )}
      </section>
    </>
  );
}
