import { permanentRedirect } from "next/navigation";

export default async function LegacyDiveSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/diving/logs/${slug}`);
}
