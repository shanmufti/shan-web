import { readFile } from "node:fs/promises";

import exifr from "exifr";
import type { CollectionBeforeOperationHook } from "payload";

/**
 * Keeps where and when a photo was taken as private database fields before
 * sharp strips the file's EXIF (collections/Media.ts). The public image never
 * carries GPS; `location` is readable only by the logged-in owner.
 *
 * Values already in the upload (admin form, bulk manifest) win over EXIF.
 */

interface ExifDetails {
  latitude?: number;
  longitude?: number;
  DateTimeOriginal?: Date;
}

interface MediaInput {
  takenAt?: string | null;
  location?: { lat?: number | null; lng?: number | null } | null;
  [key: string]: unknown;
}

async function fileBytes(file: {
  data?: Buffer;
  tempFilePath?: string;
}): Promise<Buffer | null> {
  if (file.data && file.data.length > 0) return file.data;
  if (file.tempFilePath) return readFile(file.tempFilePath);
  return null;
}

function isCoord(value: unknown, limit: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= limit
  );
}

/** media beforeOperation: copy GPS + capture time out of the original. */
export const captureExifDetails: CollectionBeforeOperationHook = async ({
  args,
  req,
}) => {
  // Only create/update carry an incoming file.
  const file = req.file;
  if (!file) return args;
  const data = (args as { data?: MediaInput }).data;
  if (!data) return args;

  try {
    const bytes = await fileBytes(file);
    if (!bytes) return args;
    const exif = (await exifr.parse(bytes, {
      gps: true,
      pick: [
        "DateTimeOriginal",
        "GPSLatitude",
        "GPSLongitude",
        "GPSLatitudeRef",
        "GPSLongitudeRef",
      ],
    })) as ExifDetails | undefined;
    if (!exif) return args;

    const hasLocation = data.location?.lat != null && data.location.lng != null;
    if (
      !hasLocation &&
      isCoord(exif.latitude, 90) &&
      isCoord(exif.longitude, 180)
    ) {
      data.location = {
        ...data.location,
        lat: Math.round(exif.latitude * 1e5) / 1e5,
        lng: Math.round(exif.longitude * 1e5) / 1e5,
      };
    }
    const taken = exif.DateTimeOriginal;
    if (
      !data.takenAt &&
      taken instanceof Date &&
      !Number.isNaN(taken.getTime())
    ) {
      data.takenAt = taken.toISOString();
    }
  } catch (error) {
    req.payload.logger.warn(
      `media: couldn't read EXIF from "${file.name}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return args;
};
