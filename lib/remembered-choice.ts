"use client";

import { useCallback, useSyncExternalStore } from "react";

// A small value remembered on this device per key (e.g. "who are you" on a
// group plan), the same way /food-tour remembers its picker. Read through
// useSyncExternalStore so the server render and first client render agree.

const LOCAL_EVENT = "remembered-choice";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_EVENT, onChange);
  };
}

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, value: string) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
    // "storage" only fires in other tabs; tell this tab too.
    window.dispatchEvent(new Event(LOCAL_EVENT));
  } catch {
    // Storage can be unavailable (private mode); picking again is fine.
  }
}

/** [value, setValue]; value is "" on the server and before anything is saved. */
export function useRememberedChoice(
  key: string,
): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => "",
  );
  const set = useCallback(
    (next: string) => {
      write(key, next);
    },
    [key],
  );
  return [value, set];
}
