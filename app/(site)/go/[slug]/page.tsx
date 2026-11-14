import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { resolveShortLink } from "@/lib/short-links-server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Every hit must reach the server: it counts the click.
export const dynamic = "force-dynamic";

/** Short link: 307 to the destination, or the site 404 page. */
export default async function ShortLinkPage({
  params,
}: PageProps<"/go/[slug]">) {
  const { slug } = await params;
  // Slugs are stored lowercase, so /go/CV works too.
  const destination = await resolveShortLink(slug.toLowerCase());
  if (!destination) notFound();
  redirect(destination);
}
