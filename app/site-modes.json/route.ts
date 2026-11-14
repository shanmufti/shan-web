import { getSectionModes } from "@/lib/site-access";

/**
 * Section access modes as static JSON, for proxy.ts. Prerendered and cached
 * under the site-access tag, which the global's hook expires on save, so the
 * proxy can learn the modes without touching the database. Only says which
 * sections are public, passcode or hidden; nothing else.
 */
export async function GET() {
  return Response.json(await getSectionModes());
}
