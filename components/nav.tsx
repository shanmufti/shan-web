import { getCurrentUser } from "@/lib/content";
import { navLinks } from "@/lib/site-access";

import { SiteNav } from "./site-nav";

function emailFromUser(user: unknown): string | null {
  if (!user || typeof user !== "object" || !("email" in user)) return null;
  if (typeof user.email !== "string") return null;
  return user.email;
}

/** Server wrapper: reads the session, then hands plain props to the client nav. */
export async function Nav() {
  const [user, links] = await Promise.all([getCurrentUser(), navLinks()]);
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
