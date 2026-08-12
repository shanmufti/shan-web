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

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const payloadSecret = process.env.PAYLOAD_SECRET;
if (!payloadSecret) {
  throw new Error("PAYLOAD_SECRET is required");
}

export default buildConfig({
  // Used for CSRF checks and absolute URL generation (admin, cookies).
  serverURL:
    process.env.NEXT_PUBLIC_SERVER_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
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
      connectionString: process.env.DATABASE_URL || "",
    },
  }),
  sharp,
  plugins: [
    // R2 is S3-compatible. Upload API endpoint ≠ public file URL (see README).
    s3Storage({
      enabled: Boolean(process.env.R2_BUCKET && process.env.R2_ENDPOINT),
      collections: {
        media: {
          // Browser loads images straight from R2 (not proxied through Vercel).
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename, prefix }) => {
            const key = prefix ? `${prefix}/${filename}` : filename;
            return `${process.env.R2_PUBLIC_URL}/${key}`;
          },
        },
      },
      // Upload from the browser → R2 directly (avoids Vercel's 4.5MB body limit).
      // Requires CORS on the R2 bucket allowing PUT from your site origins.
      clientUploads: true,
      bucket: process.env.R2_BUCKET || "",
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        },
        region: "auto",
        endpoint: process.env.R2_ENDPOINT || "",
        forcePathStyle: true,
      },
    }),
  ],
});
