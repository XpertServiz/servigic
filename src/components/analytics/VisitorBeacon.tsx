"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const HEARTBEAT_MS = 45_000;

function ping(view: boolean) {
  const body = JSON.stringify({ view });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/visitors/ping", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // fall through to fetch
  }
  fetch("/api/visitors/ping", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

/** Cookie-less visit counter: one ping per page view plus a keep-alive while the tab is visible. */
export function VisitorBeacon() {
  const pathname = usePathname();
  const skip = pathname.startsWith("/admin");

  useEffect(() => {
    if (skip) return;
    ping(true);
  }, [pathname, skip]);

  useEffect(() => {
    if (skip) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") ping(false);
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [skip]);

  return null;
}
