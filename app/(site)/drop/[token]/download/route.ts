import { claimDownload, findOpenDrop } from "@/lib/file-drops";
import { vaultFileDownload } from "@/lib/vault-storage";

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

/** Counts the download, then sends the file (or a short-lived R2 link). */
export async function POST(
  _request: Request,
  { params }: RouteContext<"/drop/[token]/download">,
) {
  const { token } = await params;
  const drop = await findOpenDrop(token);
  if (!drop) return notFound();
  if (!(await claimDownload(drop.id))) return notFound();
  return (await vaultFileDownload(drop.file)) ?? notFound();
}

/** A plain visit goes back to the download page. */
export async function GET(
  request: Request,
  { params }: RouteContext<"/drop/[token]/download">,
) {
  const { token } = await params;
  return Response.redirect(new URL(`/drop/${token}`, request.url), 303);
}
