import { useEffect, useRef } from "react";
import { AppState } from "react-native";

export const IDLE_LIMIT_MS = 60 * 60 * 1000;

/** Calls onExpire when the app has not been used for an hour. `touch()` is called on every tap; background time counts as idle. */
export function useIdleLogout(enabled: boolean, onExpire: () => void, backgroundLimitMs = Infinity) {
  const leftAt = useRef<number | null>(null);
  const last = useRef(Date.now());
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    if (!enabled) return;
    last.current = Date.now();
    const check = () => {
      if (Date.now() - last.current > IDLE_LIMIT_MS) expire.current();
    };
    const timer = setInterval(check, 60 * 1000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") leftAt.current = Date.now();
      if (s === "active") {
        // Away longer than the limit (Pro app: 10 minutes): sign in again.
        if (leftAt.current !== null && Date.now() - leftAt.current > backgroundLimitMs) expire.current();
        leftAt.current = null;
        check();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [enabled, backgroundLimitMs]);
  return () => {
    last.current = Date.now();
  };
}
