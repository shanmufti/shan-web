import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { Blog } from "./collections/Blog";
import { Diving } from "./collections/Diving";
import { Media } from "./collections/Media";
import { Tech } from "./collections/Tech";
import { Travel } from "./collections/Travel";
import { Users } from "./collections/Users";
import { env, envOr, requireEnv } from "./lib/env";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const payloadSecret = requireEnv("PAYLOAD_SECRET");

const vercelProductionUrl = env("VERCEL_PROJECT_PRODUCTION_URL");
const serverURL =
  env("NEXT_PUBLIC_SERVER_URL") ??
  (vercelProductionUrl
    ? `https://${vercelProductionUrl}`
    : "http://localhost:3000");

const r2PublicUrl = env("R2_PUBLIC_URL");
const r2Bucket = env("R2_BUCKET");
const r2Endpoint = env("R2_ENDPOINT");

export default buildConfig({
  // Used for CSRF checks and absolute URL generation (admin, cookies).
  serverURL,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Blog, Diving, Travel, Tech],
  editor: lexicalEditor(),
  secret: payloadSecret,
  // Site uses the Local API; no need to expose GraphQL publicly.
  graphQL: {
    disable: true,
  },
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      // Pooled Neon URL for serverless (Vercel). Migrations should use
      // DATABASE_URL_UNPOOLED via the `ci` script override.
      connectionString: envOr("DATABASE_URL", ""),
    },
  }),
  sharp,
  plugins: [
    // R2 is S3-compatible. Upload API endpoint ≠ public file URL (see README).
    s3Storage({
      enabled: Boolean(r2Bucket && r2Endpoint),
      collections: {
        media: {
          // Browser loads images straight from R2 (not proxied through Vercel).
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename, prefix }) => {
            const key = prefix ? `${prefix}/${filename}` : filename;
            return `${r2PublicUrl ?? ""}/${key}`;
          },
        },
      },
      // Upload from the browser → R2 directly (avoids Vercel's 4.5MB body limit).
      // Requires CORS on the R2 bucket allowing PUT from your site origins.
      clientUploads: true,
      bucket: r2Bucket ?? "",
      config: {
        credentials: {
          accessKeyId: envOr("R2_ACCESS_KEY_ID", ""),
          secretAccessKey: envOr("R2_SECRET_ACCESS_KEY", ""),
        },
        region: "auto",
        endpoint: r2Endpoint ?? "",
        forcePathStyle: true,
      },
    }),
  ],
});
