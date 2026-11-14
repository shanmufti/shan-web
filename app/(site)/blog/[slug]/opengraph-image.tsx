import { formatDate } from "@/lib/format-date";
import { isPrivate, storyDoc } from "@/lib/journeys";
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

/** Share image for a public story; private stories get the site image. */
export default async function Image({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const [story, open] = await Promise.all([
    storyDoc(slug),
    sectionIsPublic("stories"),
  ]);
  if (!story || !open || isPrivate(story)) return siteOgImage();
  return itemOgImage({
    section: "Stories",
    title: story.title,
    meta: formatDate(story.date),
  });
}
