"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ChangeOrder, Booking, Job } from "@prisma/client";
import { PhotoGallery } from "@/components/ui/PhotoGallery";

type ChangeOrderWithBooking = ChangeOrder & {
  booking: Booking & { job: Job; customer: { name: string; phone: string } };
};

export function ChangeOrderRow({ changeOrder }: { changeOrder: ChangeOrderWithBooking }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function verify() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/change-orders/${changeOrder.id}/verify`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Change order verified — extra escrow added");
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-accent/30 bg-bg-elevated p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-bold">{changeOrder.booking.job.title} — extra work</div>
          <div className="text-sm text-text-muted">
            {changeOrder.booking.customer.name} · {changeOrder.booking.customer.phone} · {changeOrder.paymentMethod}
          </div>
          <div className="mt-1 text-sm text-text-muted">{changeOrder.description}</div>
        </div>
        <div className="font-display text-xl font-bold text-accent">PKR {changeOrder.extraAmountPKR.toLocaleString()}</div>
      </div>
      {changeOrder.proofImageUrl && (
        <div className="mb-3">
          <PhotoGallery urls={[changeOrder.proofImageUrl]} label="Change order payment proof" thumbClassName="h-24 w-24" />
        </div>
      )}
      <button
        onClick={verify}
        disabled={pending}
        className="rounded-[8px] bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground disabled:opacity-60"
      >
        Verify
      </button>
    </div>
  );
}
