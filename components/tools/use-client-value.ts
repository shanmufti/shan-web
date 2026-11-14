"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => undefined;

/** True after hydration, so browser-only values (time zone, now) don't mismatch SSR. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
