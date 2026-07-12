"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Dispute, Booking, Job } from "@prisma/client";

type DisputeWithRelations = Dispute & {
  booking: Booking & { job: Job; customer: { name: string }; providerUser: { name: string } };
  openedBy: { name: string; role: string };
};

const RESOLUTIONS = [
  { value: "RELEASE", label: "Release full payout" },
  { value: "PARTIAL_REFUND", label: "Partial refund (50%)" },
  { value: "FULL_REFUND", label: "Full refund" },
] as const;

export function DisputeRow({ dispute }: { dispute: DisputeWithRelations }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function resolve(resolution: (typeof RESOLUTIONS)[number]["value"]) {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/disputes/${dispute.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution }),
      });
      if (!res.ok) throw new Error();
      toast.success("Dispute resolved");
      router.refresh();
    } catch {
      toast.error("Failed to resolve");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-danger/30 bg-bg-elevated p-5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="font-bold">{dispute.booking.job.title}</div>
          <div className="text-sm text-text-muted">
            {dispute.booking.customer.name} vs {dispute.booking.providerUser.name} · Opened by {dispute.openedBy.name} (
            {dispute.openedBy.role})
          </div>
        </div>
        <div className="font-display text-lg font-bold text-accent">PKR {dispute.booking.totalPKR.toLocaleString()}</div>
      </div>
      <p className="mb-3 text-sm text-text-muted">{dispute.reason}</p>
      {dispute.photos.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {dispute.photos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-20 w-20 rounded-[8px] object-cover" />
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {RESOLUTIONS.map((r) => (
          <button
            key={r.value}
            onClick={() => resolve(r.value)}
            disabled={pending}
            className="rounded-[8px] border border-border-subtle px-3 py-2 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-60"
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
