import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireOwner } from "@/lib/site-access";

export const metadata: Metadata = {
  title: { default: "Vault", template: "%s · Vault" },
  robots: { index: false, follow: false },
};

/**
 * Owner only. The proxy already 404s everyone else; this and the owner
 * check in lib/vault-data.ts are backups. (/vault/calendar.ics is a route
 * handler, so this layout doesn't apply to it.)
 */
export default async function VaultLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireOwner();
  return <div className="mx-auto max-w-6xl px-6 pb-8 lg:px-10">{children}</div>;
}
