import payloadConfig from "@payload-config";
import { NextResponse, type NextRequest } from "next/server";
import { getPayload } from "payload";

import {
  mayHaveSession,
  PRIVATE_ACCESS_COOKIE,
  tokenMatchesHash,
} from "@/lib/private-access";
import { proxyPasscodeHash, proxySectionModes } from "@/lib/proxy-cache";
import { resolveShortLink } from "@/lib/short-links-server";
import { canView, type Viewer } from "@/lib/site-access-rules";
import {
  isTokenPath,
  sectionForApiPath,
  sectionForPath,
} from "@/lib/site-sections";
import { unlockHref } from "@/lib/site-links";

/** Owner (logged in), passcode holder, or anonymous. */
async function viewerFor(
  request: NextRequest,
  checkPasscode: boolean,
): Promise<Viewer> {
  // Only start Payload when there's a session to check.
  if (
    mayHaveSession(
      (name) => request.cookies.has(name),
      request.headers.get("authorization"),
    )
  ) {
    const payload = await getPayload({ config: payloadConfig });
    const { user } = await payload.auth({ headers: request.headers });
    if (user) return "owner";
  }
  if (!checkPasscode) return "anonymous";
  const token = request.cookies.get(PRIVATE_ACCESS_COOKIE)?.value;
  if (!token) return "anonymous";
  return tokenMatchesHash(token, await proxyPasscodeHash())
    ? "passcode"
    : "anonymous";
}

/**
 * Enforces /admin → Settings → Access & permissions for every section page,
 * its server actions and its Payload REST collections. The landing page,
 * /unlock, /admin and assets aren't matched, so they're always reachable.
 *
 * Section modes come from a tag-cached static route (lib/proxy-cache.ts) that
 * the site-access global's hook expires, so public sections need no database
 * work here, and anonymous visitors never start Payload. Any error falls
 * back to each section's default mode (fail closed).
 */
/**
 * /go/<slug> short links: answered here, per request, so the redirect keeps
 * a real 307 status and every hit is counted. Unknown or inactive slugs (or
 * any error) fall through to app/(site)/go/[slug], which renders the 404.
 */
async function shortLinkRedirect(pathname: string): Promise<NextResponse> {
  try {
    const slug = decodeURIComponent(pathname.slice("/go/".length));
    const destination = await resolveShortLink(slug.toLowerCase());
    if (destination) {
      const res = NextResponse.redirect(destination, 307);
      res.headers.set("Cache-Control", "private, no-store");
      res.headers.set("X-Robots-Tag", "noindex");
      return res;
    }
  } catch {
    // Fall through to the 404 page.
  }
  return NextResponse.next();
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/go/")) return shortLinkRedirect(pathname);
  const isApi = pathname.startsWith("/api/");
  const section = isApi
    ? sectionForApiPath(pathname)
    : sectionForPath(pathname);
  if (!section) return NextResponse.next();
  // e.g. /vault/calendar.ics: the route checks its own token and 404s.
  if (!isApi && isTokenPath(section, pathname)) return NextResponse.next();

  const modes = await proxySectionModes(
    request.nextUrl.origin,
    request.headers.get("cookie"),
  );
  const mode = modes[section.key as keyof typeof modes];
  if (mode === "public") return NextResponse.next();

  const viewer = await viewerFor(request, !isApi && mode === "passcode");
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
    "/travel/:path*",
    "/blog/:path*",
    "/diving/:path*",
    "/tech/:path*",
    "/hobbies/:path*",
    "/food-tour/:path*",
    "/tools/:path*",
    "/vault/:path*",
    "/api/:path*",
    "/go/:path*",
  ],
};
