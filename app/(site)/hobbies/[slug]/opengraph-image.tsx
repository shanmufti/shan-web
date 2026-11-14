import { publicHobbyPage } from "@/lib/hobbies";
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

/** Share image for a public hobby; private hobbies get the site image. */
export default async function Image({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  // The anonymous view of the page: private hobbies come back as null.
  const [data, open] = await Promise.all([
    publicHobbyPage(slug),
    sectionIsPublic("hobbies"),
  ]);
  if (!data || !open || data.hobby.public === false) return siteOgImage();
  return itemOgImage({ section: "Hobbies", title: data.hobby.name });
}
