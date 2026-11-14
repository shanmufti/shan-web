import { readFile } from "node:fs/promises";
import path from "node:path";

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env, envOr } from "@/lib/env";
import { VAULT_R2_PREFIX } from "@/lib/vault";

/**
 * Server-side downloads of vault files for routes that have already checked
 * access themselves (file drops). Production: a 60-second signed R2 URL.
 * Local dev without R2: read from ./vault-files on disk.
 */

const SIGNED_URL_SECONDS = 60;

interface StoredFile {
  filename?: string | null;
  /** Name it was uploaded with; used for the download's file name. */
  originalFilename?: string | null;
  mimeType?: string | null;
  prefix?: string | null;
}

let client: S3Client | null = null;

function r2Client(): S3Client | null {
  const endpoint = env("R2_ENDPOINT");
  if (!env("R2_BUCKET") || !endpoint) return null;
  client ??= new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: envOr("R2_ACCESS_KEY_ID", ""),
      secretAccessKey: envOr("R2_SECRET_ACCESS_KEY", ""),
    },
  });
  return client;
}

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** A response that downloads the file, or null if it can't be found. */
export async function vaultFileDownload(
  file: StoredFile,
): Promise<Response | null> {
  const filename = file.filename ? path.basename(file.filename) : null;
  if (!filename) return null;
  const downloadName = file.originalFilename
    ? path.basename(file.originalFilename)
    : filename;

  const s3 = r2Client();
  if (s3) {
    const prefix = file.prefix ?? VAULT_R2_PREFIX;
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: env("R2_BUCKET"),
        Key: prefix ? `${prefix}/${filename}` : filename,
        ResponseContentDisposition: contentDisposition(downloadName),
      }),
      { expiresIn: SIGNED_URL_SECONDS },
    );
    return new Response(null, {
      status: 303,
      headers: { Location: url, "Cache-Control": "no-store" },
    });
  }

  try {
    const data = await readFile(
      path.join(process.cwd(), "vault-files", filename),
    );
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": file.mimeType ?? "application/octet-stream",
        "Content-Disposition": contentDisposition(downloadName),
        "Content-Length": String(data.byteLength),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return null;
  }
}
