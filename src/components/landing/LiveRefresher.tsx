"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-fetches the page's server components on an interval so the stats
// strip, ticker, and dispatch simulation's live data pick up new
// jobs/bids/payouts without the visitor having to reload the page.
export function LiveRefresher({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(interval);
  }, [router, intervalMs]);
  return null;
}
