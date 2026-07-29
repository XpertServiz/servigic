"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function VerifyAllButton({ topUpIds }: { topUpIds: string[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function verifyAll() {
    if (!confirm(`Verify all ${topUpIds.length} pending top-up${topUpIds.length === 1 ? "" : "s"}?`)) return;
    setPending(true);
    try {
      const results = await Promise.allSettled(topUpIds.map((id) => fetch(`/api/admin/topups/${id}/verify`, { method: "POST" })));
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
      if (failed > 0) {
        toast.error(`${topUpIds.length - failed} verified, ${failed} failed — check the list below`);
      } else {
        toast.success(`All ${topUpIds.length} top-ups verified`);
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (topUpIds.length === 0) return null;

  return (
    <button
      onClick={verifyAll}
      disabled={pending}
      className="rounded-[8px] bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground disabled:opacity-60"
    >
      {pending ? "Verifying…" : `Verify All (${topUpIds.length})`}
    </button>
  );
}
