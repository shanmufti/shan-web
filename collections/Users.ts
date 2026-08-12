import type { Access, CollectionConfig } from "payload";

const isLoggedIn: Access = ({ req: { user } }) => Boolean(user);

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  auth: {
    // HTTPS-only cookies in production; keep local http://localhost working.
    cookies: {
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    },
    // No public self-signup. First admin is created via /admin when the DB is empty;
    // after that only a logged-in user can add another.
    tokenExpiration: 60 * 60 * 24 * 7,
  },
  access: {
    admin: ({ req: { user } }) => Boolean(user),
    create: isLoggedIn,
    read: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  fields: [],
};
