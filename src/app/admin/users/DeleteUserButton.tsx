"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const LABELS: Record<string, string> = {
  Job: "jobs",
  Bid: "bids",
  Booking: "bookings",
  Review: "reviews",
  CustomerReview: "customer reviews",
  Message: "messages",
  Notification: "notifications",
  Payment: "payments",
  Payout: "payouts",
  TopUp: "top-ups",
  ProWallet: "wallets",
  Dispute: "disputes",
  TermsAcceptance: "signed agreements",
};

/**
 * Super admin: permanently delete a customer or pro, after showing exactly what goes with the account. The confirmation is a
 * window inside the page (not a browser prompt), so it also works inside the Admin app.
 */
export function DeleteUserButton({ userId, name, enabled }: { userId: string; name: string; enabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [typed, setTyped] = useState("");

  if (!enabled) return null;

  async function check() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dryRun: true }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not check this account");
      setTyped("");
      setCounts(d.counts ?? {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "DELETE" }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Delete failed");
      toast.success(`${name} deleted`);
      setCounts(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const lines = counts ? Object.entries(LABELS).filter(([t]) => counts[t]) : [];

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={check}
        className="rounded-[6px] border border-danger bg-danger/10 px-2 py-1 text-xs font-bold text-danger hover:bg-danger hover:text-white disabled:opacity-50"
      >
        {busy && !counts ? "…" : "Delete"}
      </button>
      {counts && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-danger/50 bg-bg p-5 text-start text-sm">
            <h3 className="mb-2 text-lg font-bold text-danger">Permanently delete {name}?</h3>
            <p className="mb-2 text-text-muted">The account and everything that depends on it will be deleted:</p>
            <ul className="mb-3 list-disc ps-5 text-text-muted">
              {lines.length ? lines.map(([t, label]) => <li key={t}>{`${counts[t]} ${label}`}</li>) : <li>nothing else</li>}
            </ul>
            <p className="mb-2 font-semibold">This cannot be undone. Type DELETE to confirm.</p>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" className="mb-4 w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-3 py-2 font-mono outline-none focus:border-danger" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCounts(null)} className="rounded-full border border-border-subtle px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="button" disabled={typed !== "DELETE" || busy} onClick={remove} className="rounded-full bg-danger px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
                {busy ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
