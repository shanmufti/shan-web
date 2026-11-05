import type { Access, CollectionConfig } from "payload";

type CollectionAccess = NonNullable<CollectionConfig["access"]>;

/** Anyone, including anonymous (e.g. public media / skill names). */
export const anyone: Access = () => true;

/** Logged-in admin only. */
export const authenticated: Access = ({ req: { user } }) => Boolean(user);

/**
 * Public can read published docs only. Logged-in admins can read drafts too.
 * Returning a Where query is how Payload filters the REST/Local APIs.
 * Access callbacks intentionally return `true` or a Where clause (Payload contract).
 */
// eslint-disable-next-line sonarjs/function-return-type -- Payload Access: boolean | Where
export const publishedOrAuthenticated: Access = ({ req: { user } }) => {
  if (user) return true;
  return { draft: { equals: false } };
};

/**
 * Journeys and stories: anonymous REST/Local API readers only get published,
 * public docs. Passcode holders are served by lib/content.ts, which checks the
 * cookie itself (Local API calls don't carry request cookies).
 */
// eslint-disable-next-line sonarjs/function-return-type -- Payload Access: boolean | Where
export const publishedPublicOrAuthenticated: Access = ({ req: { user } }) => {
  if (user) return true;
  return {
    and: [
      { draft: { equals: false } },
      {
        or: [
          { visibility: { equals: "public" } },
          { visibility: { exists: false } },
        ],
      },
    ],
  };
};

export const visibilityReadAccess = {
  read: publishedPublicOrAuthenticated,
  create: authenticated,
  update: authenticated,
  delete: authenticated,
} satisfies CollectionAccess;

/** Blog / diving / travel / tech / resources — drafts hidden from the public. */
export const publicContentAccess = {
  read: publishedOrAuthenticated,
  create: authenticated,
  update: authenticated,
  delete: authenticated,
} satisfies CollectionAccess;

/**
 * Like publicContentAccess, but anyone can create (public dive-log form).
 * Update/delete stay authenticated.
 */
export const publicCreateContentAccess = {
  read: publishedOrAuthenticated,
  create: anyone,
  update: authenticated,
  delete: authenticated,
} satisfies CollectionAccess;

/** Fully public reads; writes require login (media, dive-skills). */
export const publicReadAccess = {
  read: anyone,
  create: authenticated,
  update: authenticated,
  delete: authenticated,
} satisfies CollectionAccess;

/** Authenticated only — inventory, kits, users. */
export const privateAccess = {
  read: authenticated,
  create: authenticated,
  update: authenticated,
  delete: authenticated,
} satisfies CollectionAccess;

/** Auth collection: same as private, plus admin panel gate (boolean-only). */
export const usersAccess = {
  admin: ({ req: { user } }: { req: { user: unknown } }) => Boolean(user),
  ...privateAccess,
} satisfies CollectionAccess;
