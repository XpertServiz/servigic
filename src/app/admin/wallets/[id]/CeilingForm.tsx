"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CeilingForm({ walletId, currentCeilingPKR }: { walletId: string; currentCeilingPKR: number }) {
  const router = useRouter();
  const [ceilingPKR, setCeilingPKR] = useState(currentCeilingPKR);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/wallets/${walletId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ceilingPKR }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ceiling updated");
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
      <label className="mb-1.5 block text-sm font-semibold text-text-muted">Debt ceiling override (PKR)</label>
      <div className="flex gap-2">
        <input
          type="number"
          value={ceilingPKR}
          onChange={(e) => setCeilingPKR(Number(e.target.value))}
          className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 outline-none focus:border-accent"
        />
        <button
          onClick={save}
          disabled={pending}
          className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
