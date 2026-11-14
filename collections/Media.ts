import type { CollectionConfig } from "payload";

import {
  defaultAltFromFilename,
  renameMediaUpload,
  replaceClientUpload,
} from "@/lib/media-upload";

import { publicReadAccess } from "./access";

/**
 * Public images: post and journey covers, journey photos. Stored in R2 and
 * served from R2_PUBLIC_URL (media.smufti.com), never through Vercel.
 *
 * On upload, sharp (on the server):
 * - caps the stored original at 2560px on the long edge and re-encodes it,
 *   which drops all EXIF (GPS, camera serials); `withMetadata` stays off;
 * - writes WebP sizes thumb / card / large for srcset (lib/media.ts).
 *
 * HEIC isn't accepted (sharp can't decode it): export JPEG from Photos.
 * Names are made unique and the browser upload is replaced by the processed
 * file: see lib/media-upload.ts.
 */
const webp = { format: "webp" as const, options: { quality: 78 } };

export const Media: CollectionConfig = {
  slug: "media",
  admin: { group: "Photos" },
  access: publicReadAccess,
  hooks: {
    beforeOperation: [renameMediaUpload],
    beforeChange: [replaceClientUpload, defaultAltFromFilename],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      admin: {
        description:
          "Describe the photo for screen readers. Falls back to the file name if left blank (handy for bulk uploads).",
      },
    },
    { name: "caption", type: "textarea" },
    {
      name: "takenAt",
      type: "date",
      admin: { description: "When the photo was taken (date only shown)." },
    },
  ],
  upload: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    resizeOptions: {
      width: 2560,
      height: 2560,
      fit: "inside",
      withoutEnlargement: true,
    },
    imageSizes: [
      {
        name: "thumb",
        width: 480,
        withoutEnlargement: true,
        formatOptions: webp,
      },
      {
        name: "card",
        width: 960,
        withoutEnlargement: true,
        formatOptions: webp,
      },
      {
        name: "large",
        width: 2048,
        withoutEnlargement: true,
        formatOptions: webp,
      },
    ],
    adminThumbnail: "thumb",
    focalPoint: true,
  },
};
