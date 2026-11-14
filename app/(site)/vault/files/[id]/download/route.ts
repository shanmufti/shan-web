import config from "@payload-config";
import { getPayload } from "payload";

import { vaultFileDownload } from "@/lib/vault-storage";

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Owner-only download under the file's original name. The proxy already
 * 404s non-owners on /vault; the lookup below runs with the visitor's own
 * access too.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/vault/files/[id]/download">,
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return notFound();
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return notFound();
  try {
    const file = await payload.findByID({
      collection: "vault-files",
      id,
      depth: 0,
      user,
      overrideAccess: false,
    });
    return (await vaultFileDownload(file)) ?? notFound();
  } catch {
    return notFound();
  }
}
