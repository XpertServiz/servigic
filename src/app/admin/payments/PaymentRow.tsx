"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Payment, Booking, Job } from "@prisma/client";

type PaymentWithBooking = Payment & {
  booking: Booking & { job: Job; customer: { name: string; phone: string } };
};

export function PaymentRow({ payment }: { payment: PaymentWithBooking }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function act(action: "verify" | "reject") {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(action === "verify" ? "Payment verified — job unlocked" : "Payment rejected");
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-bold">{payment.booking.job.title}</div>
          <div className="text-sm text-text-muted">
            {payment.booking.customer.name} · {payment.booking.customer.phone} · {payment.method}
          </div>
        </div>
        <div className="font-display text-xl font-bold text-accent">PKR {payment.amountPKR.toLocaleString()}</div>
      </div>
      {payment.proofImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={payment.proofImageUrl} alt="Payment proof" className="mb-3 max-h-64 rounded-[10px] border border-border-subtle" />
      )}
      <div className="flex gap-2">
        <button
          onClick={() => act("verify")}
          disabled={pending}
          className="rounded-[8px] bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground disabled:opacity-60"
        >
          Verify
        </button>
        <button
          onClick={() => act("reject")}
          disabled={pending}
          className="rounded-[8px] border border-danger/40 px-4 py-2 text-sm font-semibold text-danger disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
