import type { NextConfig } from "next";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";

export default async function config(phase: string): Promise<NextConfig> {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  const isBuild = phase === PHASE_PRODUCTION_BUILD;

  if (!process.env.VELITE_STARTED && (isDev || isBuild)) {
    process.env.VELITE_STARTED = "1";
    const { build } = await import("velite");
    // build() resolves once the initial build completes; in watch mode it
    // then starts a detached background watcher without blocking this await
    await build({ watch: isDev, clean: !isDev });
  }

  const nextConfig: NextConfig = {/* config options here */};
  return nextConfig;
}
