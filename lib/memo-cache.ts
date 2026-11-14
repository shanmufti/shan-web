/**
 * Tiny in-process cache keyed by cache tag, for proxy.ts (Proxy can't use
 * `"use cache"`, and its Data Cache isn't available under `next start`).
 *
 * Entries live for `ttlMs` at most. lib/revalidate.ts clears the matching
 * entry whenever it expires a tag, so a change made through this process is
 * seen at once; other server instances catch up within the TTL.
 * Failures are never stored.
 */

// On globalThis: proxy.ts and the Payload hooks are bundled separately, so
// a module-level Map would be two different maps in the same process.
const store = globalThis as typeof globalThis & {
  __siteMemo?: Map<string, { value: unknown; at: number }>;
  __siteMemoInflight?: Map<string, Promise<unknown>>;
};
const entries = (store.__siteMemo ??= new Map());
const inflight = (store.__siteMemoInflight ??= new Map());

export async function memo<T>(
  tag: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = entries.get(tag);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;

  const pending = inflight.get(tag);
  if (pending) return pending as Promise<T>;

  const promise = load()
    .then((value) => {
      entries.set(tag, { value, at: Date.now() });
      return value;
    })
    .finally(() => inflight.delete(tag));
  inflight.set(tag, promise);
  return promise;
}

export function clearMemo(tag: string) {
  entries.delete(tag);
}
