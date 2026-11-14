import { permanentRedirect } from "next/navigation";

// Legacy redirect, resolved per request.
export const instant = false;

// A placeholder param list lets unknown slugs render before anything
// streams, so the redirect keeps its real 308 status.
export function generateStaticParams() {
  return [{ slug: "__none__" }];
}

export default async function LegacyDiveSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/diving/logs/${slug}`);
}
