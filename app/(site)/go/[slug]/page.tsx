import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Short links are resolved, counted and redirected (307) in proxy.ts, per
 * request, before any rendering. Requests only get here for unknown or
 * inactive slugs, so this always shows the site's 404 page.
 *
 * The placeholder param makes every other slug render before anything
 * streams, so the response keeps a real 404 status.
 */
export function generateStaticParams() {
  return [{ slug: "__none__" }];
}

export const instant = false;

export default async function ShortLinkNotFound({
  params,
}: PageProps<"/go/[slug]">) {
  await params;
  notFound();
}
