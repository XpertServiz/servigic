"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const CUSTOMER_REASONS = [
  { code: "CUSTOMER_CHANGED_MIND", label: "Changed my mind" },
  { code: "CUSTOMER_FOUND_ANOTHER_PRO", label: "Found another pro" },
  { code: "CUSTOMER_PRICE_TOO_HIGH", label: "Price too high" },
  { code: "CUSTOMER_PRO_ASKED_TO_CANCEL", label: "The pro asked me to cancel" },
  { code: "OTHER", label: "Other" },
] as const;

const PROVIDER_REASONS = [
  { code: "PROVIDER_UNAVAILABLE", label: "No longer available" },
  { code: "PROVIDER_JOB_TOO_FAR", label: "Job too far" },
  { code: "PROVIDER_PRICE_DISPUTE", label: "Price dispute" },
  { code: "OTHER", label: "Other" },
] as const;

// Anti-Disintermediation System — cancellation friction (v7 §2.3). Shared
// between the customer and pro booking-detail pages since both hit the same
// /api/bookings/[id]/cancel route; only the reason-chip set differs by role.
export function CancelBookingSection({ bookingId, role }: { bookingId: string; role: "CUSTOMER" | "PROVIDER" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const reasons = role === "CUSTOMER" ? CUSTOMER_REASONS : PROVIDER_REASONS;

  async function submit() {
    if (!reasonCode) return;
    setPending(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reasonCode, reasonNote: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to cancel");
        return;
      }
      toast.success("Booking cancelled");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 rounded-[8px] border border-danger/40 px-4 py-2 text-sm font-semibold text-danger"
      >
        Cancel booking
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-[14px] border border-danger/30 bg-danger/10 p-5">
      <h3 className="mb-3 font-bold text-danger">Cancel this booking?</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {reasons.map((r) => (
          <button
            key={r.code}
            onClick={() => setReasonCode(r.code)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              reasonCode === r.code ? "border-danger bg-danger/20 text-danger" : "border-border-subtle text-text-muted"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything else? (optional)"
        rows={2}
        className="mb-3 w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm outline-none focus:border-danger"
      />
      <p className="mb-3 text-xs text-text-muted">
        {role === "CUSTOMER"
          ? "Repeated cancellations affect your posting privileges — this one counts against your 30-day cancellation rate."
          : "Repeated cancellations pause your job alerts — this one counts against your 30-day cancellation rate."}
      </p>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending || !reasonCode}
          className="rounded-[8px] bg-danger px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Cancelling…" : "Confirm cancellation"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-[8px] border border-border-subtle px-4 py-2 text-sm font-semibold">
          Never mind
        </button>
      </div>
    </div>
  );
}
