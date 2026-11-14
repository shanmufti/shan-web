import { connection } from "next/server";

import {
  addItem,
  getSharedList,
  MAX_ITEM_LENGTH,
  setItemChecked,
} from "@/lib/shared-lists";

const headers = { "Cache-Control": "no-store" };

function notFound(): Response {
  return Response.json({ error: "Not found" }, { status: 404, headers });
}

/** Current state of the list, polled by the share page. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/lists/[shareSlug]/items">,
) {
  await connection();
  const { shareSlug } = await params;
  const list = await getSharedList(shareSlug);
  return list ? Response.json(list, { headers }) : notFound();
}

/**
 * { action: "toggle", id, checked } or { action: "add", label }. Anyone with
 * the link may do either; returns the list as it is afterwards.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/lists/[shareSlug]/items">,
) {
  const { shareSlug } = await params;
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("bad body");
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400, headers });
  }

  let ok = false;
  if (
    body["action"] === "toggle" &&
    typeof body["id"] === "string" &&
    typeof body["checked"] === "boolean"
  ) {
    ok = await setItemChecked(shareSlug, body["id"], body["checked"]);
  } else if (body["action"] === "add" && typeof body["label"] === "string") {
    const label = body["label"].trim().slice(0, MAX_ITEM_LENGTH);
    if (label === "") {
      return Response.json({ error: "Empty item" }, { status: 400, headers });
    }
    ok = await addItem(shareSlug, label);
    if (!ok && (await getSharedList(shareSlug))) {
      return Response.json(
        { error: "This list is full." },
        { status: 409, headers },
      );
    }
  } else {
    return Response.json({ error: "Bad request" }, { status: 400, headers });
  }

  const list = ok ? await getSharedList(shareSlug) : null;
  return list ? Response.json(list, { headers }) : notFound();
}
