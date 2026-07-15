"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function VerifyAllButton({ paymentIds }: { paymentIds: string[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function verifyAll() {
    if (!confirm(`Verify all ${paymentIds.length} pending payment${paymentIds.length === 1 ? "" : "s"}? This unlocks contact/chat on each job immediately.`)) {
      return;
    }
    setPending(true);
    try {
      const results = await Promise.allSettled(
        paymentIds.map((id) => fetch(`/api/admin/payments/${id}/verify`, { method: "POST" }))
      );
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
      if (failed > 0) {
        toast.error(`${paymentIds.length - failed} verified, ${failed} failed — check the list below`);
      } else {
        toast.success(`All ${paymentIds.length} payments verified`);
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (paymentIds.length === 0) return null;

  return (
    <button
      onClick={verifyAll}
      disabled={pending}
      className="rounded-[8px] bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground disabled:opacity-60"
    >
      {pending ? "Verifying…" : `Verify All (${paymentIds.length})`}
    </button>
  );
}
