/**
 * Validation for the link shortener (collection `short-links`, route /go/[slug]).
 * Pure functions: shared by the collection config and the redirect route.
 */

export const SHORT_LINK_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export function validateShortLinkSlug(value: unknown): true | string {
  if (typeof value !== "string" || value.length === 0)
    return "Slug is required.";
  if (!SHORT_LINK_SLUG_PATTERN.test(value)) {
    return "Use 1-64 lowercase letters, digits and hyphens, not starting or ending with a hyphen.";
  }
  return true;
}

export function validateDestination(value: unknown): true | string {
  if (typeof value !== "string" || value.trim() === "") {
    return "Destination URL is required.";
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Enter a full URL, including https://";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Only http:// and https:// URLs are allowed.";
  }
  if (url.username || url.password) {
    return "URLs with a username or password are not allowed.";
  }
  return true;
}
