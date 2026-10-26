"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CancelFeeRow({ row }: { row: { id: string; fee: number; title: string; customer: string; pro: string; when: string; proof: { lat: number | null; lng: number | null; at: string } | null } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(action: "paid" | "waive") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/${row.id}/cancel-fee`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      if (!res.ok) throw new Error();
      toast.success(action === "paid" ? "Marked paid; the pro was credited" : "Fee waived");
      router.refresh();
    } catch {
      toast.error("Could not update");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border-subtle bg-bg-elevated p-4">
      <div className="text-sm">
        <div className="font-semibold">{row.title}</div>
        <div className="text-text-muted">Customer: {row.customer} · Pro: {row.pro} · {new Date(row.when).toLocaleString()}</div>
        {row.proof && <div className="text-xs text-text-muted">Pro&apos;s proof: {new Date(row.proof.at).toLocaleTimeString()} {row.proof.lat != null ? `at ${row.proof.lat.toFixed(5)}, ${row.proof.lng?.toFixed(5)}` : ""}</div>}
      </div>
      <div className="flex items-center gap-3">
        <span className="font-bold text-accent">{row.fee.toLocaleString()}</span>
        <button disabled={busy} onClick={() => act("paid")} className="rounded-[8px] bg-accent px-3 py-2 text-xs font-bold text-accent-foreground disabled:opacity-50">Mark paid</button>
        <button disabled={busy} onClick={() => act("waive")} className="rounded-[8px] border border-border-subtle px-3 py-2 text-xs font-semibold disabled:opacity-50">Waive</button>
      </div>
    </div>
  );
}
