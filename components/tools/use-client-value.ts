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

// Shared clock for "now" displays. Read only in the browser: the server
// snapshot is 0, so prerendering (Cache Components) never calls Date.now().
let nowValue = 0;

function readNow(): number {
  if (nowValue === 0) nowValue = Date.now();
  return nowValue;
}

function subscribeNow(onChange: () => void): () => void {
  const id = setInterval(() => {
    nowValue = Date.now();
    onChange();
  }, 1000);
  return () => {
    clearInterval(id);
  };
}

/** Current time in ms, ticking every second; 0 during server rendering. */
export function useNow(): number {
  return useSyncExternalStore(subscribeNow, readNow, () => 0);
}
