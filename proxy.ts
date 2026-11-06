import payloadConfig from "@payload-config";
import { NextResponse, type NextRequest } from "next/server";
import { getPayload } from "payload";

import {
  isValidAccessToken,
  PRIVATE_ACCESS_COOKIE,
} from "@/lib/private-access";
import { getSectionModes } from "@/lib/section-modes";
import { canView, type Viewer } from "@/lib/site-access-rules";
import { sectionForApiPath, sectionForPath } from "@/lib/site-sections";
import { unlockHref } from "@/lib/site-links";

/**
 * Enforces /admin → Settings → Access & permissions for every section page,
 * its server actions and its Payload REST collections. The landing page,
 * /unlock, /admin and assets aren't matched, so they're always reachable.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const section = isApi
    ? sectionForApiPath(pathname)
    : sectionForPath(pathname);
  if (!section) return NextResponse.next();

  const payload = await getPayload({ config: payloadConfig });
  const modes = await getSectionModes(payload);
  const mode = modes[section.key as keyof typeof modes];
  if (mode === "public") return NextResponse.next();

  let viewer: Viewer = "anonymous";
  const { user } = await payload.auth({ headers: request.headers });
  if (user) {
    viewer = "owner";
  } else if (!isApi && mode === "passcode") {
    const token = request.cookies.get(PRIVATE_ACCESS_COOKIE)?.value;
    if (await isValidAccessToken(payload, token)) viewer = "passcode";
  }
  if (canView(mode, viewer)) return NextResponse.next();

  if (isApi) {
    return NextResponse.json(
      { errors: [{ message: "Not Found" }] },
      { status: 404 },
    );
  }
  if (mode === "passcode") {
    return NextResponse.redirect(
      new URL(unlockHref(`${pathname}${search}`), request.url),
    );
  }
  // Hidden: look exactly like a page that doesn't exist.
  return NextResponse.rewrite(new URL("/_hidden", request.url), {
    status: 404,
  });
}

export const config = {
  matcher: [
    "/journal/:path*",
    "/travel/:path*",
    "/blog/:path*",
    "/diving/:path*",
    "/tech/:path*",
    "/food-tour/:path*",
    "/api/:path*",
  ],
};
