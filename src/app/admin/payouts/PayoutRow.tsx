"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Payout, ProviderProfile, Booking, Job } from "@prisma/client";

type PayoutWithRelations = Payout & {
  provider: ProviderProfile & { user: { name: string; phone: string } };
  booking: Booking & { job: Job };
};

export function PayoutRow({ payout }: { payout: PayoutWithRelations }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function markSent() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/payouts/${payout.id}/mark-sent`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Marked sent");
      router.refresh();
    } catch {
      toast.error("Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-[12px] border border-border-subtle bg-bg-elevated p-5">
      <div>
        <div className="font-bold">{payout.provider.displayName || payout.provider.user.name}</div>
        <div className="text-sm text-text-muted">
          {payout.booking.job.title} · {payout.provider.payoutMethod ?? payout.method} · {payout.provider.payoutAccount ?? "no account on file"}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="font-display text-lg font-bold text-accent">PKR {payout.amountPKR.toLocaleString()}</div>
        <button
          onClick={markSent}
          disabled={pending}
          className="rounded-[8px] bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground disabled:opacity-60"
        >
          Mark Sent
        </button>
      </div>
    </div>
  );
}
