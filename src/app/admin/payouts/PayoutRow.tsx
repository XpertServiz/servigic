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

  const missingAccount = !payout.provider.payoutAccount;
  const whatsappMessage = `Hi ${payout.provider.displayName || payout.provider.user.name}, this is Servigic — we're ready to send your PKR ${payout.amountPKR.toLocaleString()} payout for "${payout.booking.job.title}" but don't have your EasyPaisa/JazzCash/bank account on file yet. Please reply with your payout account number so we can send it.`;

  return (
    <div className="flex items-center justify-between rounded-[12px] border border-border-subtle bg-bg-elevated p-5">
      <div>
        <div className="font-bold">{payout.provider.displayName || payout.provider.user.name}</div>
        <div className="text-sm text-text-muted">
          {payout.booking.job.title} · {payout.provider.payoutMethod ?? payout.method} ·{" "}
          {missingAccount ? (
            <span className="text-danger">no account on file</span>
          ) : (
            payout.provider.payoutAccount
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="font-display text-lg font-bold text-accent">PKR {payout.amountPKR.toLocaleString()}</div>
        {missingAccount && (
          <a
            href={`https://wa.me/${payout.provider.user.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[8px] border border-secondary px-4 py-2 text-sm font-semibold text-secondary"
          >
            WhatsApp →
          </a>
        )}
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
