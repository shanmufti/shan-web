import { randomBytes } from "node:crypto";
import path from "node:path";

import type {
  CollectionBeforeChangeHook,
  CollectionBeforeOperationHook,
  Config,
  Endpoint,
  PayloadRequest,
  Plugin,
} from "payload";

/**
 * Public photos (`media`) on R2: unique names, and no camera original left
 * in the bucket.
 *
 * Why this exists:
 * - Phone photos share names (IMG_1234.JPG on every trip). The admin's
 *   browser → R2 upload picks the R2 key before Payload checks for
 *   duplicates, so a second IMG_1234.JPG would overwrite the first one's
 *   file. Every upload gets a readable but unique name instead.
 * - With browser → R2 uploads, Payload downloads the file again to make the
 *   image sizes, but the storage plugin never re-uploads the main file. The
 *   camera original (full size, GPS in its EXIF) would stay public.
 *   `replaceClientUpload` makes the plugin upload Payload's processed main
 *   file (capped size, no EXIF) over that same key.
 */

const COLLECTION = "media";
const SIGNED_URL_PATH = "/storage-s3-generate-signed-url";

/** Extension sharp writes for each input type, so the processed main file
 * lands on the same key as the browser upload (".jpeg" would become ".jpg"). */
const EXT_BY_TYPE: Record<string, string> = {
  ".jpg": ".jpg",
  ".jpeg": ".jpg",
  ".png": ".png",
  ".webp": ".webp",
  ".avif": ".avif",
  ".gif": ".gif",
};

/** "IMG_1234.JPEG" → "img-1234-3f9c2a71.jpg" */
export function uniqueMediaName(original: string): string {
  const ext = path.extname(original).toLowerCase();
  const base =
    path
      .basename(original, path.extname(original))
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "photo";
  return `${base}-${randomBytes(4).toString("hex")}${EXT_BY_TYPE[ext] ?? ext}`;
}

interface SignedUrlBody {
  collectionSlug?: unknown;
  filename?: unknown;
  [key: string]: unknown;
}

/** Wraps the storage-s3 signed-URL endpoint for media uploads. */
function wrapSignedUrlEndpoint(endpoint: Endpoint): Endpoint {
  const original = endpoint.handler;
  return {
    ...endpoint,
    handler: async (req: PayloadRequest) => {
      if (!req.json) return original(req);
      const body = (await req.json()) as SignedUrlBody;
      const nextBody =
        body.collectionSlug === COLLECTION && typeof body.filename === "string"
          ? { ...body, filename: uniqueMediaName(body.filename) }
          : body;
      req.json = () => Promise.resolve(nextBody);
      // The admin switches to the returned filename (updateFilename).
      return original(req);
    },
  };
}

/** Payload plugin; list it after s3Storage in payload.config.ts. */
export function mediaUploadNames(): Plugin {
  return (config: Config): Config => ({
    ...config,
    endpoints: (config.endpoints ?? []).map((endpoint) =>
      endpoint.path === SIGNED_URL_PATH && endpoint.method === "post"
        ? wrapSignedUrlEndpoint(endpoint)
        : endpoint,
    ),
  });
}

/** media beforeOperation: unique name for server-side uploads (scripts,
 * local dev). Client uploads were already renamed by the signed-URL step. */
export const renameMediaUpload: CollectionBeforeOperationHook = ({
  args,
  req,
}) => {
  const file = req.file;
  if (file && !file.clientUploadContext) {
    file.name = uniqueMediaName(file.name);
  }
  return args;
};

/**
 * media beforeChange (runs after Payload has resized the file and stripped
 * its metadata): forget that the browser already uploaded it, so the
 * storage plugin uploads the processed file over the original.
 */
export const replaceClientUpload: CollectionBeforeChangeHook = ({
  data,
  req,
}) => {
  const file = req.file;
  if (file?.clientUploadContext) {
    const filename: unknown = data["filename"];
    if (typeof filename === "string" && filename !== file.name) {
      req.payload.logger.warn(
        `media: processed "${filename}" differs from uploaded "${file.name}"; the uploaded original stays in R2`,
      );
    }
    req.file = { ...file, clientUploadContext: undefined };
  }
  return data;
};

/** Bulk uploads skip typing alt text: fall back to a readable file name. */
export const defaultAltFromFilename: CollectionBeforeChangeHook = ({
  data,
}) => {
  const doc = data as { alt?: string | null; filename?: string | null };
  if (!doc.alt?.trim() && doc.filename) {
    doc.alt = doc.filename
      .replace(/\.[^.]+$/, "")
      .replace(/-[0-9a-f]{8}$/, "")
      .replace(/[-_]+/g, " ")
      .trim();
  }
  return doc;
};
