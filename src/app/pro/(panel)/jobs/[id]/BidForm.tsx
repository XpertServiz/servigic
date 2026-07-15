"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Bid } from "@prisma/client";

export function BidForm({
  jobId,
  jobStatus,
  existingBid,
  verificationLevel,
  bidWinHintEnabled,
}: {
  jobId: string;
  jobStatus: string;
  existingBid: Bid | null;
  verificationLevel: number;
  bidWinHintEnabled: boolean;
}) {
  const router = useRouter();
  const [price, setPrice] = useState(existingBid?.pricePKR?.toString() ?? "");
  const [eta, setEta] = useState(existingBid?.etaMinutes?.toString() ?? "");
  const [message, setMessage] = useState(existingBid?.message ?? "");
  const [partsNote, setPartsNote] = useState(existingBid?.estimatedPartsNote ?? "");
  const [pending, setPending] = useState(false);
  const [winHint, setWinHint] = useState<{ winProbability: number; isHeuristic: boolean } | null>(null);

  useEffect(() => {
    if (!bidWinHintEnabled || !price || !eta || Number(price) <= 0 || Number(eta) <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing a stale hint when inputs become invalid
      setWinHint(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch("/api/ai/bids/win-probability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, pricePKR: Number(price), etaMinutes: Number(eta) }),
        });
        if (res.ok) setWinHint(await res.json());
      } catch {
        // silent — this is a nice-to-have hint, not a blocking action
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [bidWinHintEnabled, jobId, price, eta]);

  if (verificationLevel < 1) {
    return (
      <div className="rounded-[10px] border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">
        Complete document verification before you can bid.
      </div>
    );
  }

  if (jobStatus !== "OPEN" && !existingBid) {
    return <p className="text-text-muted">This job is no longer open for bidding.</p>;
  }

  async function submitBid(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          pricePKR: Number(price),
          etaMinutes: Number(eta),
          message: message || undefined,
          estimatedPartsNote: partsNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit bid");
        return;
      }
      toast.success(existingBid ? "Bid updated" : "Bid submitted");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function respondToCounter(action: "accept" | "decline") {
    if (!existingBid) return;
    setPending(true);
    try {
      const res = await fetch(`/api/bids/${existingBid.id}/counter-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "accept" ? "Counter-offer accepted" : "Counter-offer declined");
      router.refresh();
    } catch {
      toast.error("Failed to respond");
    } finally {
      setPending(false);
    }
  }

  if (existingBid?.status === "COUNTERED") {
    return (
      <div className="rounded-[14px] border border-accent/30 bg-accent/10 p-5">
        <p className="mb-4 font-semibold">
          Customer countered with <span className="text-accent">PKR {existingBid.counterPricePKR?.toLocaleString()}</span>{" "}
          (your bid was PKR {existingBid.pricePKR.toLocaleString()})
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => respondToCounter("accept")}
            disabled={pending}
            className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            Accept
          </button>
          <button
            onClick={() => respondToCounter("decline")}
            disabled={pending}
            className="rounded-[8px] border border-danger/40 px-4 py-2 text-sm font-semibold text-danger disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  if (existingBid && existingBid.status !== "PENDING") {
    return (
      <div className="rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 text-sm text-text-muted">
        Bid status: <span className="font-bold text-text">{existingBid.status}</span>
        {existingBid.declineReason && ` — ${existingBid.declineReason}`}
      </div>
    );
  }

  return (
    <form onSubmit={submitBid} className="flex flex-col gap-4 rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
      <h3 className="font-bold">{existingBid ? "Edit your bid" : "Submit a bid"}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-text-muted">Price (PKR)</label>
          <input
            required
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-4 py-3 outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-text-muted">ETA (minutes)</label>
          <input
            required
            type="number"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
            className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-4 py-3 outline-none focus:border-accent"
          />
        </div>
      </div>
      {winHint && (
        <div className="rounded-[8px] border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">
          💡 Price to win: ~{Math.round(winHint.winProbability * 100)}% chance
          {winHint.isHeuristic ? " (estimate)" : ""}
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text-muted">Estimated parts/materials cost (optional)</label>
        <input
          type="text"
          value={partsNote}
          onChange={(e) => setPartsNote(e.target.value)}
          placeholder="e.g. ~PKR 1,500 for pipe fittings"
          className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-4 py-3 outline-none focus:border-accent"
        />
        <p className="mt-1.5 text-xs text-text-dim">
          Shown to the customer as an estimate only — Servigic never collects this. You&apos;ll settle parts payment
          directly with them.
        </p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text-muted">Message (optional)</label>
        <textarea
          rows={3}
          value={message ?? ""}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Contact info is automatically removed"
          className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-4 py-3 outline-none focus:border-accent"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] bg-accent px-6 py-3 font-bold text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Submitting…" : existingBid ? "Update Bid" : "Submit Bid"}
      </button>
    </form>
  );
}
