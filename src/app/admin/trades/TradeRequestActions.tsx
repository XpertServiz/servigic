"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function TradeRequestActions({ id, certificateRequested }: { id: string; certificateRequested: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function act(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/trade-requests/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(ok);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const btn = "rounded-[10px] px-4 py-2 text-sm font-bold disabled:opacity-50";
  return (
    <div className="flex flex-col gap-3">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note to the pro (required to reject, optional for a certificate request)"
        className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => act({ action: "approve" }, "Trade approved")} className={`${btn} bg-secondary text-black`}>
          Approve
        </button>
        <button
          disabled={busy}
          onClick={() => act({ action: "request-certificate", note: note || undefined }, "Certificate requested")}
          className={`${btn} border border-accent/50 text-accent`}
        >
          {certificateRequested ? "Re-send certificate request" : "Request certificate / photo"}
        </button>
        <button disabled={busy || note.trim().length < 3} onClick={() => act({ action: "reject", note }, "Trade rejected")} className={`${btn} border border-danger/40 text-danger`}>
          Reject
        </button>
      </div>
    </div>
  );
}
