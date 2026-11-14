import { countryName } from "@/lib/country-names";
import {
  itemOgImage,
  OG_CONTENT_TYPE,
  OG_SIZE,
  publicDestination,
  sectionIsPublic,
  siteOgImage,
} from "@/lib/og-image";

export const alt = "Shan Mufti";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Share image for a public destination; anything else gets the site image. */
export default async function Image({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const [destination, open] = await Promise.all([
    publicDestination(slug),
    sectionIsPublic("places"),
  ]);
  if (!destination || !open) return siteOgImage();
  return itemOgImage({
    section: "Places",
    title: destination.title,
    meta: destination.country ? countryName(destination.country) : null,
  });
}
