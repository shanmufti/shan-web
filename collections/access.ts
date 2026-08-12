import type { Access } from "payload";

/** Logged-in admin only (create / update / delete). */
export const authenticated: Access = ({ req: { user } }) => Boolean(user);

/**
 * Public can read published docs only. Logged-in admins can read drafts too.
 * Returning a Where query is how Payload filters the REST/GraphQL APIs.
 */
export const publishedOrAuthenticated: Access = ({ req: { user } }) => {
  if (user) return true;
  return { draft: { equals: false } };
};
