import type { CollectionConfig } from "payload";

import {
  defaultAltFromFilename,
  renameMediaUpload,
  replaceClientUpload,
} from "@/lib/media-upload";

import { captureExifDetails } from "@/lib/photo-exif";

import { publicReadAccess } from "./access";

/** Location is private: hidden from the public REST API and anonymous reads. */
const ownerOnly = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

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
 *
 * Where and when the photo was taken are copied from its EXIF into
 * `location` and `takenAt` first (lib/photo-exif.ts). `location` is
 * owner-only: the public site and API never see it.
 */
const webp = { format: "webp" as const, options: { quality: 78 } };

export const Media: CollectionConfig = {
  slug: "media",
  admin: { group: "Photos" },
  access: publicReadAccess,
  hooks: {
    // EXIF is read before anything else touches the file.
    beforeOperation: [captureExifDetails, renameMediaUpload],
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
      admin: {
        description:
          "When the photo was taken. Filled from the photo's EXIF on upload.",
      },
    },
    {
      name: "location",
      type: "group",
      access: { read: ownerOnly, create: ownerOnly, update: ownerOnly },
      admin: {
        description:
          "Private: where the photo was taken. Filled from GPS on upload (the public file has no GPS). Only you can see this.",
      },
      fields: [
        {
          type: "row",
          fields: [
            { name: "lat", type: "number", min: -90, max: 90 },
            { name: "lng", type: "number", min: -180, max: 180 },
          ],
        },
        {
          name: "place",
          type: "text",
          admin: {
            description: "Optional name, e.g. Roma Norte, Mexico City.",
          },
        },
      ],
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
