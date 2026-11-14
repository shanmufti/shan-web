import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(__filename);

interface WebpackResolve {
  extensionAlias?: Record<string, string[]>;
}

interface WebpackConfigLike {
  resolve?: WebpackResolve;
}

function withExtensionAliases(config: WebpackConfigLike): WebpackConfigLike {
  config.resolve ??= {};
  config.resolve.extensionAlias = {
    ".cjs": [".cts", ".cjs"],
    ".js": [".ts", ".tsx", ".js", ".jsx"],
    ".mjs": [".mts", ".mjs"],
  };
  return config;
}

const nextConfig: NextConfig = {
  // Public pages prerender to static shells with cached CMS data; per-viewer
  // parts (account link, private content) stream in at request time.
  cacheComponents: true,
  images: {
    // Media is served straight from R2; no Vercel image optimisation
    // (not on the free plan). See components/picture.tsx.
    unoptimized: true,
  },
  webpack: (config) => withExtensionAliases(config as WebpackConfigLike),
  turbopack: {
    root: path.resolve(dirname),
  },
  experimental: {
    // Two root layouts ((site) and (payload)), so unmatched URLs need
    // app/global-not-found.tsx for a styled 404.
    globalNotFound: true,
    serverActions: {
      // Food tour photo uploads. The browser shrinks photos to ~0.5MB
      // first; Vercel caps request bodies at 4.5MB.
      bodySizeLimit: "4mb",
    },
  },
};

const withPayloadConfig = withPayload(nextConfig, {
  devBundleServerPackages: false,
});
const payloadHeaders = withPayloadConfig.headers;

/**
 * Payload adds a site-wide `Critical-CH: Sec-CH-Prefers-Color-Scheme` (plus
 * Accept-CH and Vary) for the admin's theme. On public pages that makes a
 * first visit fetch every page twice and splits caches by colour scheme; the
 * site picks its theme in the browser (lib/theme.ts). Keep it on /admin only.
 */
export default {
  ...withPayloadConfig,
  // Stories (/blog) was retired in Nov 2026; old links land on Journeys.
  redirects() {
    return Promise.resolve([
      { source: "/blog", destination: "/travel", permanent: false },
      { source: "/blog/:path*", destination: "/travel", permanent: false },
    ]);
  },
  async headers() {
    const rules = (await payloadHeaders?.()) ?? [];
    return rules.map((rule) =>
      rule.source === "/:path*" &&
      rule.headers.some((h) => h.key === "Critical-CH")
        ? { ...rule, source: "/admin/:path*" }
        : rule,
    );
  },
} satisfies NextConfig;
