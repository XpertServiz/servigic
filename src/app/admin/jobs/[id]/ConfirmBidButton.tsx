"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ConfirmBidButton({ jobId, bidId, customerName }: { jobId: string; bidId: string; customerName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/confirm-bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId, customerAgreed: agreed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not confirm");
      toast.success("Pro confirmed for the customer");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-[10px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground">
        Confirm for customer
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-accent/40 bg-accent/10 p-3 text-sm">
      <label className="flex max-w-[260px] items-start gap-2">
        <input type="checkbox" className="mt-1 accent-secondary" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>{customerName} agreed to this pro and price (by phone / WhatsApp).</span>
      </label>
      <div className="flex gap-2">
        <button onClick={confirm} disabled={!agreed || busy} className="rounded-[8px] bg-accent px-3 py-1.5 font-bold text-accent-foreground disabled:opacity-50">
          {busy ? "Confirming..." : "Confirm booking"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-[8px] border border-border-subtle px-3 py-1.5">
          Cancel
        </button>
      </div>
    </div>
  );
}
