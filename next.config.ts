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
  webpack: (config) => withExtensionAliases(config as WebpackConfigLike),
  turbopack: {
    root: path.resolve(dirname),
  },
  experimental: {
    // Two root layouts ((site) and (payload)), so unmatched URLs need
    // app/global-not-found.tsx for a styled 404.
    globalNotFound: true,
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
