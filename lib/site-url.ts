import { env } from "@/lib/env";

/** Absolute site origin for sitemap, RSS and metadata. */
export function siteUrl(): string {
  const explicit = env("NEXT_PUBLIC_SERVER_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = env("VERCEL_PROJECT_PRODUCTION_URL");
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}
