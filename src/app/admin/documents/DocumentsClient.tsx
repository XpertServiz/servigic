"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const TYPES = ["ID", "POLICE", "LICENSE", "CERTIFICATE", "INSURANCE", "OTHER"] as const;

/** Approve, or reject with a reason the pro will see. */
export function DocumentReview({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function send(body: object) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/documents/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Failed");
      toast.success("Saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (rejecting) {
    return (
      <div className="flex w-full max-w-xs flex-col gap-2">
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. photo is blurry, date not visible)" className="rounded-[8px] border border-border-subtle bg-bg px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => send({ action: "reject", reason })} className="rounded-full bg-danger px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40">
            Reject
          </button>
          <button type="button" onClick={() => setRejecting(false)} className="rounded-full border border-border-subtle px-4 py-1.5 text-sm">
            Cancel
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <button type="button" disabled={busy} onClick={() => send({ action: "approve" })} className="rounded-full bg-secondary px-4 py-1.5 text-sm font-bold text-black disabled:opacity-40">
        Approve
      </button>
      <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="rounded-full border border-danger px-4 py-1.5 text-sm font-semibold text-danger">
        Reject
      </button>
    </div>
  );
}

/** Reminder days before expiry, grace days after expiry, and mandatory document types. */
export function DocumentSettingsForm({ alertDays, graceDays, mandatory }: { alertDays: number[]; graceDays: number; mandatory: string[] }) {
  const router = useRouter();
  const [days, setDays] = useState(alertDays.join(", "));
  const [grace, setGrace] = useState(String(graceDays));
  const [types, setTypes] = useState<string[]>(mandatory);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/documents/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertDays: days.split(",").map((x) => Number(x.trim())).filter((n) => n > 0), graceDays: Number(grace) || 0, mandatory: types }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Failed");
      toast.success("Rules saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-[14px] border border-border-subtle bg-bg-elevated p-5 text-sm">
      <label className="flex flex-col gap-1">
        <span className="font-semibold">Remind the pro this many days before expiry</span>
        <input value={days} onChange={(e) => setDays(e.target.value)} className="rounded-[8px] border border-border-subtle bg-bg px-3 py-2" />
        <span className="text-xs text-text-muted">Comma separated, e.g. 30, 14, 7. A reminder is also sent on the expiry day.</span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">Days allowed after expiry before job access is paused</span>
        <input value={grace} onChange={(e) => setGrace(e.target.value)} inputMode="numeric" className="w-32 rounded-[8px] border border-border-subtle bg-bg px-3 py-2" />
      </label>
      <div>
        <div className="mb-1 font-semibold">Mandatory documents (expired = no new jobs after the grace period)</div>
        <div className="flex flex-wrap gap-3">
          {TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2">
              <input type="checkbox" checked={types.includes(t)} onChange={(e) => setTypes(e.target.checked ? [...types, t] : types.filter((x) => x !== t))} />
              {t}
            </label>
          ))}
        </div>
      </div>
      <button type="button" disabled={busy} onClick={save} className="self-start rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground disabled:opacity-50">
        Save rules
      </button>
    </div>
  );
}
