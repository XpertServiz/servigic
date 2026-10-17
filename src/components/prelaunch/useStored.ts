"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};

/** Reads a localStorage value without a hydration mismatch: `undefined` on the server and during hydration, then the stored value (or null). */
export function useStored(key: string): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => undefined,
  );
}

/** Writes a localStorage value and refreshes every component reading it. */
export function setStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: the choice just lasts until the page is closed */
  }
  listeners.forEach((cb) => cb());
}

/** True while a stored "hidden until" timestamp is still in the future; `undefined` until hydrated. */
export function useHiddenUntil(key: string): boolean | undefined {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return Number(localStorage.getItem(key) || 0) > Date.now();
      } catch {
        return false;
      }
    },
    () => undefined,
  );
}
