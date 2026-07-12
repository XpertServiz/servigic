"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { VerificationBadge } from "@/components/ui/VerificationBadge";

interface Offer {
  bid: {
    id: string;
    pricePKR: number;
    etaMinutes: number;
    providerName: string;
    ratingAvg: number;
    ratingCount: number;
    verificationLevel: number;
  };
  expiresAt: string;
}

export function InstantMatchOffer({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!offer) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((new Date(offer.expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [offer]);

  async function requestMatch() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/instant-match`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No Instant Match offer available right now");
        return;
      }
      setOffer(data);
    } finally {
      setLoading(false);
    }
  }

  async function accept() {
    if (!offer) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/bids/${offer.bid.id}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to accept — try again");
        return;
      }
      toast.success("Matched! Proceed to payment");
      router.push(`/bookings/${data.booking.id}`);
    } finally {
      setAccepting(false);
    }
  }

  if (!offer) {
    return (
      <button
        onClick={requestMatch}
        disabled={loading}
        className="mb-6 w-full rounded-[12px] border border-accent bg-accent/10 px-5 py-4 text-left disabled:opacity-60"
      >
        <div className="font-bold text-accent">🚨 Instant Match — skip bidding, book now</div>
        <div className="text-sm text-text-muted">
          {loading ? "Finding the nearest available pro…" : "Get matched to the nearest verified pro in seconds, still fully escrow-protected."}
        </div>
      </button>
    );
  }

  if (secondsLeft <= 0) {
    return (
      <div className="mb-6 rounded-[12px] border border-border-subtle bg-bg-elevated p-4 text-sm text-text-muted">
        Your Instant Match offer expired — that offer is still visible below as a regular bid, or wait for more bids.
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-[14px] border border-accent bg-accent/10 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-bold text-accent">Instant Match offer</span>
        <span className="rounded-full border border-accent/40 px-3 py-1 text-xs font-bold text-accent">
          {secondsLeft}s to accept
        </span>
      </div>
      <div className="mb-1 flex items-center gap-2">
        <span className="font-bold">{offer.bid.providerName}</span>
        <VerificationBadge level={offer.bid.verificationLevel} />
      </div>
      <div className="mb-3 text-xs text-text-muted">
        {offer.bid.ratingCount > 0 ? `${offer.bid.ratingAvg.toFixed(1)}★` : "New"} · ETA {offer.bid.etaMinutes} min
      </div>
      <div className="mb-4 font-display text-2xl font-bold text-accent">PKR {offer.bid.pricePKR.toLocaleString()}</div>
      <button
        onClick={accept}
        disabled={accepting}
        className="w-full rounded-[10px] bg-accent px-4 py-3 text-sm font-bold text-accent-foreground disabled:opacity-60"
      >
        {accepting ? "Booking…" : "Accept & Book Now"}
      </button>
    </div>
  );
}
