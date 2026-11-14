import { formatDateRange } from "@/lib/format-date";
import { isPrivate, journeyDoc } from "@/lib/journeys";
import {
  itemOgImage,
  OG_CONTENT_TYPE,
  OG_SIZE,
  sectionIsPublic,
  siteOgImage,
} from "@/lib/og-image";

export const alt = "Shan Mufti";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Share image for a public journey; private ones get the site image. */
export default async function Image({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const [journey, open] = await Promise.all([
    journeyDoc(slug),
    sectionIsPublic("journeys"),
  ]);
  if (!journey || !open || isPrivate(journey)) return siteOgImage();
  return itemOgImage({
    section: "Journeys",
    title: journey.title,
    meta: formatDateRange(journey.startDate, journey.endDate),
  });
}
