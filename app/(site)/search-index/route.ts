import { buildSearchIndex } from "@/lib/search-index";

/**
 * Command palette data for the current visitor. Not matched by proxy.ts, so
 * buildSearchIndex() applies the section modes and private visibility itself.
 * Never cached: the answer depends on the visitor's cookies.
 */
export async function GET() {
  const items = await buildSearchIndex();
  return Response.json(
    { items },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
