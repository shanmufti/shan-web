import { OG_CONTENT_TYPE, OG_SIZE, siteOgImage } from "@/lib/og-image";

export const alt = "Shan Mufti";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Default share image for every page without its own. */
export default function OpengraphImage() {
  return siteOgImage();
}
