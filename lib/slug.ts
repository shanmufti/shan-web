/** URL-safe slug from a title (lowercase, hyphenated). */
export function formatSlug(value: string): string {
  let slug = value
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, "-");
  while (slug.startsWith("-")) slug = slug.slice(1);
  while (slug.endsWith("-")) slug = slug.slice(0, -1);
  return slug;
}
