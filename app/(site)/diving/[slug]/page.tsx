import { permanentRedirect } from "next/navigation";

// Legacy redirect, resolved per request.
export const instant = false;

export default async function LegacyDiveSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/diving/logs/${slug}`);
}
