import { burnSecret } from "@/lib/secrets";

/**
 * Hands over a secret's ciphertext and deletes it in the same statement.
 * POST only, so link previews and prefetchers can't burn it.
 */
export async function POST(
  _request: Request,
  { params }: RouteContext<"/s/[id]/open">,
) {
  const { id } = await params;
  const secret = await burnSecret(id);
  const headers = { "Cache-Control": "no-store" };
  if (!secret) {
    return Response.json({ error: "gone" }, { status: 404, headers });
  }
  return Response.json(secret, { headers });
}
