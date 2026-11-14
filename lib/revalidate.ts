import { revalidateTag } from "next/cache";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
  GlobalAfterChangeHook,
  GlobalConfig,
} from "payload";

import { collectionTag, globalTag } from "@/lib/cache-tags";
import { clearMemo } from "@/lib/memo-cache";

/**
 * Expire cached site data when content changes in /admin (or through the
 * site's own forms). `expire: 0` makes the next request fetch fresh data
 * instead of serving the stale copy once more.
 *
 * Outside a Next.js request (e.g. `payload run` scripts) there is no cache to
 * clear and revalidateTag throws; that's safe to ignore because the cache has
 * a daily safety-net revalidation (next.config.ts → cacheLife.content).
 */
function expireTags(tags: string[]) {
  for (const tag of tags) {
    clearMemo(tag);
    try {
      revalidateTag(tag, { expire: 0 });
    } catch {
      // Not in a Next.js request scope.
    }
  }
}

/** afterChange + afterDelete hooks that expire `collection:<slug>`. */
function revalidateCollectionHooks(
  slug: string,
): NonNullable<CollectionConfig["hooks"]> {
  const afterChange: CollectionAfterChangeHook = ({ doc }) => {
    expireTags([collectionTag(slug)]);
    return doc as unknown;
  };
  const afterDelete: CollectionAfterDeleteHook = ({ doc }) => {
    expireTags([collectionTag(slug)]);
    return doc as unknown;
  };
  return { afterChange: [afterChange], afterDelete: [afterDelete] };
}

/** afterChange hook that expires `global:<slug>`. */
function revalidateGlobalHook(slug: string): GlobalAfterChangeHook {
  return ({ doc }) => {
    expireTags([globalTag(slug)]);
    return doc as unknown;
  };
}

/** Adds the revalidation hooks to a collection, keeping its own hooks. */
export function withCollectionRevalidation(
  config: CollectionConfig,
): CollectionConfig {
  const extra = revalidateCollectionHooks(config.slug);
  return {
    ...config,
    hooks: {
      ...config.hooks,
      afterChange: [
        ...(config.hooks?.afterChange ?? []),
        ...(extra.afterChange ?? []),
      ],
      afterDelete: [
        ...(config.hooks?.afterDelete ?? []),
        ...(extra.afterDelete ?? []),
      ],
    },
  };
}

/** Adds the revalidation hook to a global, keeping its own hooks. */
export function withGlobalRevalidation(config: GlobalConfig): GlobalConfig {
  return {
    ...config,
    hooks: {
      ...config.hooks,
      afterChange: [
        ...(config.hooks?.afterChange ?? []),
        revalidateGlobalHook(config.slug),
      ],
    },
  };
}
