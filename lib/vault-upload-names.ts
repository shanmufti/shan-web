import { randomBytes } from "node:crypto";
import path from "node:path";

import type {
  CollectionBeforeOperationHook,
  Config,
  Endpoint,
  PayloadRequest,
  Plugin,
} from "payload";

import { readCookie } from "@/lib/private-access";

/**
 * Vault files are stored under an unguessable name (32 random hex chars +
 * the original extension), so their R2 key under vault/ can't be guessed
 * from the bucket's public domain. The name the file was uploaded with is
 * kept in `originalFilename` for display and downloads.
 *
 * Two upload paths:
 * - Server uploads (local dev, server actions, REST multipart): the
 *   collection's beforeOperation hook renames req.file before Payload
 *   saves it.
 * - Admin client uploads (production, browser → R2): the key is fixed when
 *   the browser asks for a signed PUT URL, before any collection hook runs.
 *   `vaultUploadNames()` wraps that endpoint to swap in the random name
 *   (the admin then uses it, via updateFilename) and sets a short-lived
 *   cookie mapping the random name back to the original, which the hook
 *   reads when the document is saved.
 */

const COLLECTION = "vault-files";
const SIGNED_URL_PATH = "/storage-s3-generate-signed-url";
const COOKIE_PREFIX = "vault_upload_";
const HEX_NAME = /^([0-9a-f]{32})(\.[a-z0-9]{1,10})?$/;
const MAX_ORIGINAL_LENGTH = 200;

/** "Passport Scan.PDF" → "3f9c…e1.pdf" */
function randomStoredName(original: string): string {
  const ext = path.extname(original).toLowerCase();
  const safeExt = /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : "";
  return `${randomBytes(16).toString("hex")}${safeExt}`;
}

function cleanOriginal(name: string): string {
  return path.basename(name).slice(0, MAX_ORIGINAL_LENGTH) || "file";
}

function cookieName(storedName: string): string | null {
  const match = HEX_NAME.exec(storedName);
  return match?.[1] ? `${COOKIE_PREFIX}${match[1]}` : null;
}

interface SignedUrlBody {
  collectionSlug?: unknown;
  filename?: unknown;
  [key: string]: unknown;
}

/** Wraps the storage-s3 signed-URL endpoint for vault-files uploads. */
function wrapSignedUrlEndpoint(endpoint: Endpoint): Endpoint {
  const original = endpoint.handler;
  return {
    ...endpoint,
    handler: async (req: PayloadRequest) => {
      if (!req.json) return original(req);
      const body = (await req.json()) as SignedUrlBody;
      const isVault =
        body.collectionSlug === COLLECTION && typeof body.filename === "string";
      const originalName = isVault ? cleanOriginal(String(body.filename)) : "";
      const nextBody = isVault
        ? { ...body, filename: randomStoredName(originalName) }
        : body;
      req.json = () => Promise.resolve(nextBody);

      const response = await original(req);
      if (!isVault || !response.ok) return response;

      const result = (await response.clone().json()) as { filename?: unknown };
      const name = cookieName(
        typeof result.filename === "string" ? result.filename : "",
      );
      if (!name) return response;
      const headers = new Headers(response.headers);
      const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      headers.append(
        "Set-Cookie",
        `${name}=${encodeURIComponent(originalName)}; Path=/api/${COLLECTION}; Max-Age=3600; HttpOnly; SameSite=Strict${secure}`,
      );
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    },
  };
}

/** Payload plugin; list it after s3Storage in payload.config.ts. */
export function vaultUploadNames(): Plugin {
  return (config: Config): Config => ({
    ...config,
    endpoints: (config.endpoints ?? []).map((endpoint) =>
      endpoint.path === SIGNED_URL_PATH && endpoint.method === "post"
        ? wrapSignedUrlEndpoint(endpoint)
        : endpoint,
    ),
  });
}

/** vault-files beforeOperation: random stored name, original kept. */
export const renameVaultUpload: CollectionBeforeOperationHook = ({
  args,
  req,
}) => {
  // Only create/update carry an incoming file.
  const file = req.file;
  if (!file) return args;

  let originalName: string;
  if (file.clientUploadContext) {
    // Already in R2 under the name the signed-URL step chose.
    const name = cookieName(file.name);
    const fromCookie = name
      ? readCookie(req.headers.get("cookie"), name)
      : undefined;
    originalName = cleanOriginal(fromCookie ?? file.name);
    if (!name) {
      req.payload.logger.warn(
        `vault-files: client upload "${file.name}" was not given a random name`,
      );
    }
  } else {
    originalName = cleanOriginal(file.name);
    file.name = randomStoredName(originalName);
  }

  const data = (args as { data?: Record<string, unknown> }).data;
  if (data) data["originalFilename"] = originalName;
  return args;
};
