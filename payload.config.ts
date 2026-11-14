import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { Blog } from "./collections/Blog";
import { DiveGear } from "./collections/DiveGear";
import { DiveResources } from "./collections/DiveResources";
import { DiveSkills } from "./collections/DiveSkills";
import { FoodRatings } from "./collections/FoodRatings";
import { FoodTour } from "./collections/FoodTour";
import { FoodTourPhotos } from "./collections/FoodTourPhotos";
import { Diving } from "./collections/Diving";
import { GearConfigs } from "./collections/GearConfigs";
import { Hobbies } from "./collections/Hobbies";
import { HobbyReferences } from "./collections/HobbyReferences";
import { LandingPage } from "./collections/LandingPage";
import { Media } from "./collections/Media";
import { PackingListTemplates } from "./collections/PackingListTemplates";
import { PackingLists } from "./collections/PackingLists";
import { PracticeSessions } from "./collections/PracticeSessions";
import { SiteAccess } from "./collections/SiteAccess";
import { ShortLinks } from "./collections/ShortLinks";
import { SiteSettings } from "./collections/SiteSettings";
import { Tech } from "./collections/Tech";
import { Travel } from "./collections/Travel";
import { UnlockAttempts } from "./collections/UnlockAttempts";
import { Users } from "./collections/Users";
import { FileDrops } from "./collections/FileDrops";
import { Snippets } from "./collections/Snippets";
import { VaultFiles } from "./collections/VaultFiles";
import { VaultRecords } from "./collections/VaultRecords";
import { VaultSettings } from "./collections/VaultSettings";
import { VisitedCountries } from "./collections/VisitedCountries";
import { env, envOr, requireEnv } from "./lib/env";
import {
  withCollectionRevalidation,
  withGlobalRevalidation,
} from "./lib/revalidate";
import { VAULT_R2_PREFIX } from "./lib/vault";
import { vaultUploadNames } from "./lib/vault-upload-names";

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
    components: {
      // Always visible in the admin header (including /admin/account).
      actions: ["/components/admin/ViewSiteLink#ViewSiteLink"],
      beforeNavLinks: ["/components/admin/ViewSiteLink#ViewSiteLink"],
    },
  },
  // Content collections and globals expire their cache tag on every change
  // (lib/revalidate.ts), so /admin edits show without a redeploy. Users,
  // unlock attempts and the food tour are never cached, so they're left out.
  collections: [
    Users,
    ...[
      Media,
      Blog,
      Diving,
      DiveGear,
      GearConfigs,
      DiveSkills,
      DiveResources,
      Travel,
      Tech,
      VisitedCountries,
      PackingListTemplates,
      PackingLists,
      Hobbies,
      HobbyReferences,
      PracticeSessions,
      VaultRecords,
      VaultFiles,
      FileDrops,
      Snippets,
    ].map(withCollectionRevalidation),
    UnlockAttempts,
    FoodRatings,
    FoodTourPhotos,
    ShortLinks,
  ],
  globals: [
    ...[SiteAccess, LandingPage, SiteSettings, VaultSettings].map(
      withGlobalRevalidation,
    ),
    FoodTour,
  ],
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
        "food-tour-photos": {
          prefix: "food-tour",
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename, prefix }) => {
            const key = prefix ? `${prefix}/${filename}` : filename;
            return `${r2PublicUrl ?? ""}/${key}`;
          },
        },
        // Private: no public URL. Files are served by Payload's
        // /api/vault-files/file/<name> route, which checks login, then
        // redirects to a signed R2 URL valid for 60 seconds. The bucket's
        // public domain must block /vault/* (see README).
        "vault-files": {
          prefix: VAULT_R2_PREFIX,
          signedDownloads: { expiresIn: 60 },
        },
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
    // Must come after s3Storage: gives vault-files client uploads a random
    // R2 key (see lib/vault-upload-names.ts).
    vaultUploadNames(),
  ],
});
