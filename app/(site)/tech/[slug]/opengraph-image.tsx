import { getPublishedBySlug } from "@/lib/content";
import { formatDate } from "@/lib/format-date";
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

/** Share image for a public tech note; anything else gets the site image. */
export default async function Image({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  // Read as an anonymous visitor: private notes come back as null.
  const [note, open] = await Promise.all([
    getPublishedBySlug("tech", slug),
    sectionIsPublic("tech"),
  ]);
  if (!note || !open) return siteOgImage();
  return itemOgImage({
    section: "Tech",
    title: note.title,
    meta: formatDate(note.date),
  });
}
