import { Suspense } from "react";

import { getCurrentUser } from "@/lib/content";
import { navSections, publicNavSections } from "@/lib/site-access";

import { SiteNav } from "./site-nav";

function emailFromUser(user: unknown): string | null {
  if (!user || typeof user !== "object" || !("email" in user)) return null;
  if (typeof user.email !== "string") return null;
  return user.email;
}

/** Reads the session, then hands plain props to the client nav. */
async function ViewerNav() {
  const [user, links] = await Promise.all([getCurrentUser(), navSections()]);
  const email = emailFromUser(user);

  return (
    <SiteNav
      links={links}
      account={
        user
          ? {
              href: "/admin",
              label: email ? (email.split("@")[0] ?? "Admin") : "Admin",
              title: email ?? "Open admin",
            }
          : null
      }
    />
  );
}

/**
 * Prerendered as an anonymous visitor sees it (public sections, "Log in");
 * the visitor's own sections and account stream in, so anonymous visitors
 * see no change and the owner sees their extra links a moment later.
 */
async function PublicNav() {
  return <SiteNav links={await publicNavSections()} account={null} />;
}

export function Nav() {
  return (
    <Suspense fallback={<PublicNav />}>
      <ViewerNav />
    </Suspense>
  );
}
