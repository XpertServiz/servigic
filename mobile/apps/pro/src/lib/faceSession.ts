import { useSyncExternalStore } from "react";

// Whether the pro passed the face check since the app was opened / he signed in. Not stored: every app open asks again.
let passed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const faceSession = {
  isPassed: () => passed,
  pass() {
    passed = true;
    emit();
  },
  reset() {
    if (!passed) return;
    passed = false;
    emit();
  },
};

export function useFaceVerified(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => passed,
    () => false,
  );
}
