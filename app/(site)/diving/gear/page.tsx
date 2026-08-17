import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DivingSubnav } from "@/components/diving-subnav";
import { formatDate } from "@/lib/format-date";
import { listDiveGearForUser } from "@/lib/content";
import { serviceStatus, type DiveGearDoc } from "@/lib/dive-gear-service";

export const metadata: Metadata = { title: "Dive gear" };

const gearTypeLabels: Record<string, string> = {
  regulator: "Regulator",
  tank: "Tank",
  bcd: "BCD",
  drysuit: "Drysuit",
  fins: "Fins",
  mask: "Mask",
  light: "Light",
  computer: "Computer",
  utility: "Utility",
  "outer-layer": "Outer Layer",
  undergarment: "Undergarment",
  other: "Other",
};

function ServiceBadge({ item }: Readonly<{ item: DiveGearDoc }>) {
  const status = serviceStatus(item);
  if (!status) return null;

  if (status === "overdue") {
    return <Badge variant="destructive">Service overdue</Badge>;
  }
  if (status === "due-soon") {
    return <Badge variant="warning">Service due soon</Badge>;
  }
  return <Badge variant="success">Service up to date</Badge>;
}

export default async function DiveGearPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ status?: string }>;
}>) {
  const { status: statusParam } = await searchParams;
  const status =
    statusParam === "researching" || statusParam === "owned"
      ? statusParam
      : "owned";

  const data = await listDiveGearForUser();

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header>
          <h1 className="font-heading text-2xl font-semibold">Gear</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Kit inventory is private.
          </p>
          <DivingSubnav current="/diving/gear" />
        </header>
        <p className="text-muted-foreground mt-10 text-sm">
          Sign in via{" "}
          <Link
            href="/admin"
            className="font-medium underline-offset-4 hover:underline"
          >
            admin
          </Link>{" "}
          to view owned gear, research lists, and configs.
        </p>
      </div>
    );
  }

  const { gear, configs } = data;
  const filtered = gear.filter((item) => item.status === status);

  const byType = new Map<string, typeof filtered>();
  for (const item of filtered) {
    const list = byType.get(item.gearType) ?? [];
    list.push(item);
    byType.set(item.gearType, list);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header>
        <h1 className="font-heading text-2xl font-semibold">Gear</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Owned kit, research list, and named equipment configs.
        </p>
        <DivingSubnav current="/diving/gear" />
      </header>

      <div className="mt-8 flex gap-4 text-sm">
        <Link
          href="/diving/gear?status=owned"
          className={
            status === "owned"
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }
        >
          Owned
        </Link>
        <Link
          href="/diving/gear?status=researching"
          className={
            status === "researching"
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }
        >
          Researching
        </Link>
      </div>

      <div className="mt-8 space-y-8">
        {[...byType.entries()].map(([type, items]) => (
          <section key={type}>
            <h2 className="font-heading text-base font-semibold">
              {gearTypeLabels[type] ?? type}
            </h2>
            <ul className="mt-3 space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="border-border border-b pb-3 text-sm"
                >
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {item.name}
                    {item.brand || item.model
                      ? ` · ${[item.brand, item.model].filter(Boolean).join(" ")}`
                      : ""}
                    {status === "owned" ? <ServiceBadge item={item} /> : null}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {item.lastServiced
                      ? `Last serviced ${formatDate(item.lastServiced)}`
                      : "No service date"}
                  </p>
                  {item.linkUrl ? (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs underline-offset-4 hover:underline"
                    >
                      Product link
                    </a>
                  ) : null}
                  {item.notes ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {item.notes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">No {status} gear yet.</p>
        ) : null}
      </div>

      {configs.length > 0 ? (
        <section className="mt-14">
          <h2 className="font-heading text-lg font-semibold">Configs</h2>
          <ul className="mt-4 space-y-3">
            {configs.map((config) => (
              <li
                key={config.id}
                className="border-border border-b pb-3 text-sm"
              >
                <p className="font-medium">{config.name}</p>
                {config.notes ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {config.notes}
                  </p>
                ) : null}
                {config.undergarmentSetup ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Undergarments: {config.undergarmentSetup}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-sm">
        <Link
          href="/admin/collections/dive-gear"
          className="font-medium underline-offset-4 hover:underline"
        >
          Manage gear in admin
        </Link>
      </p>
    </div>
  );
}
