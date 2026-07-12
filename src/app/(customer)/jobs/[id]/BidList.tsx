"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DECLINE_REASONS } from "@/lib/validation/bid";

type BidView = {
  id: string;
  proLabel: string;
  pricePKR: number;
  etaMinutes: number;
  message: string | null;
  status: string;
  counterPricePKR: number | null;
  ratingAvg: number;
  ratingCount: number;
  jobsCompleted: number;
  verificationLevel: number;
  distanceBand: string;
};

const LEVEL_LABEL: Record<number, string> = { 0: "Unverified", 1: "Verified", 2: "Verified Pro", 3: "Gold Ustad" };
type SortKey = "price" | "rating" | "eta" | "distance";

export function BidList({ jobId, bids, jobStatus }: { jobId: string; bids: BidView[]; jobStatus: string }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<BidView | null>(null);
  const [counterTarget, setCounterTarget] = useState<BidView | null>(null);
  const [counterPrice, setCounterPrice] = useState("");

  const sorted = useMemo(() => {
    const copy = [...bids];
    switch (sortKey) {
      case "rating":
        return copy.sort((a, b) => b.ratingAvg - a.ratingAvg);
      case "eta":
        return copy.sort((a, b) => a.etaMinutes - b.etaMinutes);
      case "distance":
        return copy.sort((a, b) => a.distanceBand.localeCompare(b.distanceBand));
      default:
        return copy.sort((a, b) => a.pricePKR - b.pricePKR);
    }
  }, [bids, sortKey]);

  async function accept(bidId: string) {
    setPendingId(bidId);
    try {
      const res = await fetch(`/api/bids/${bidId}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to accept bid");
        return;
      }
      toast.success("Bid accepted — proceed to payment");
      router.push(`/bookings/${data.booking.id}`);
    } finally {
      setPendingId(null);
    }
  }

  async function submitDecline(reason: (typeof DECLINE_REASONS)[number]) {
    if (!declineTarget) return;
    setPendingId(declineTarget.id);
    try {
      const res = await fetch(`/api/bids/${declineTarget.id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error();
      toast.success("Bid declined");
      setDeclineTarget(null);
      router.refresh();
    } catch {
      toast.error("Failed to decline");
    } finally {
      setPendingId(null);
    }
  }

  async function submitCounter() {
    if (!counterTarget || !counterPrice) return;
    setPendingId(counterTarget.id);
    try {
      const res = await fetch(`/api/bids/${counterTarget.id}/counter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterPricePKR: Number(counterPrice) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send counter-offer");
        return;
      }
      toast.success("Counter-offer sent");
      setCounterTarget(null);
      setCounterPrice("");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (jobStatus !== "OPEN" && bids.length === 0) {
    return <p className="text-text-muted">This job is no longer accepting bids.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["price", "rating", "eta", "distance"] as SortKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setSortKey(k)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${
              sortKey === k ? "border-accent bg-accent text-accent-foreground" : "border-border-subtle text-text-muted"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {sorted.map((bid) => (
          <div key={bid.id} className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="font-bold">{bid.proLabel}</div>
                <div className="text-xs text-text-muted">
                  {LEVEL_LABEL[bid.verificationLevel]} · {bid.ratingCount > 0 ? `${bid.ratingAvg.toFixed(1)}★` : "New"} ·{" "}
                  {bid.jobsCompleted} jobs · {bid.distanceBand}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl font-bold text-accent">PKR {bid.pricePKR.toLocaleString()}</div>
                <div className="text-xs text-text-muted">ETA {bid.etaMinutes} min</div>
              </div>
            </div>
            {bid.message && <p className="mb-3 text-sm text-text-muted">{bid.message}</p>}
            {bid.status === "COUNTERED" && (
              <p className="mb-3 text-sm font-semibold text-accent">
                Your counter-offer of PKR {bid.counterPricePKR?.toLocaleString()} is pending the pro&apos;s response.
              </p>
            )}
            {bid.status === "PENDING" && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => accept(bid.id)}
                  disabled={pendingId === bid.id}
                  className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
                >
                  Accept
                </button>
                <button
                  onClick={() => setCounterTarget(bid)}
                  className="rounded-[8px] border border-border-subtle px-4 py-2 text-sm font-semibold hover:border-accent"
                >
                  Counter-offer
                </button>
                <button
                  onClick={() => setDeclineTarget(bid)}
                  className="rounded-[8px] border border-danger/40 px-4 py-2 text-sm font-semibold text-danger"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {declineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
            <h3 className="mb-4 font-bold">Why are you declining?</h3>
            <div className="flex flex-col gap-2">
              {DECLINE_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => submitDecline(r)}
                  className="rounded-[8px] border border-border-subtle px-4 py-2.5 text-left text-sm hover:border-accent"
                >
                  {r}
                </button>
              ))}
            </div>
            <button onClick={() => setDeclineTarget(null)} className="mt-4 text-sm text-text-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {counterTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
            <h3 className="mb-1 font-bold">Send a counter-offer</h3>
            <p className="mb-4 text-xs text-text-muted">Current bid: PKR {counterTarget.pricePKR.toLocaleString()}. One counter-offer per bid.</p>
            <input
              type="number"
              value={counterPrice}
              onChange={(e) => setCounterPrice(e.target.value)}
              placeholder="Your price in PKR"
              className="mb-4 w-full rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-4 py-3 outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <button
                onClick={submitCounter}
                disabled={!counterPrice || pendingId === counterTarget.id}
                className="flex-1 rounded-[8px] bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground disabled:opacity-60"
              >
                Send
              </button>
              <button
                onClick={() => setCounterTarget(null)}
                className="rounded-[8px] border border-border-subtle px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
