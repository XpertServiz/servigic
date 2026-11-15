"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ALL_STATUSES, LOST_REASONS, canMove } from "@/lib/bigProjectsOptions";

const inputCls = "min-h-[44px] w-full rounded-xl border border-border-subtle bg-bg-elevated-2 px-3 text-sm text-text";
const btnCls = "min-h-[44px] rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground disabled:opacity-60";

export function ProjectActions(props: { id: string; status: string; contractAmount: number | null; warrantyDays: number; currency: string; siteVisitAt: string; siteVisitNotes: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [lost, setLost] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<"note" | "call">("note");
  const [visit, setVisit] = useState(props.siteVisitAt);
  const [visitNotes, setVisitNotes] = useState(props.siteVisitNotes);
  const [amount, setAmount] = useState(props.contractAmount ? String(props.contractAmount) : "");
  const [warranty, setWarranty] = useState(String(props.warrantyDays));

  async function send(body: object, done: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/projects/${props.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error || "Failed");
      toast.success(done);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const box = "rounded-[14px] border border-border-subtle bg-bg-elevated p-4";
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className={box}>
        <h3 className="mb-2 font-bold">Status</h3>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          <option value="">Move to...</option>
          {ALL_STATUSES.filter((s) => canMove(props.status, s)).map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
        </select>
        {status === "lost" && (
          <select value={lost} onChange={(e) => setLost(e.target.value)} className={`${inputCls} mt-2`}>
            <option value="">Reason...</option>
            {LOST_REASONS.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}
          </select>
        )}
        <button disabled={busy || !status || (status === "lost" && !lost)} onClick={() => send({ action: "status", status, lostReason: status === "lost" ? lost : undefined }, "Status updated")} className={`${btnCls} mt-3`}>Update status</button>
      </div>

      <div className={box}>
        <h3 className="mb-2 font-bold">Site visit (free)</h3>
        <input type="datetime-local" value={visit} onChange={(e) => setVisit(e.target.value)} className={inputCls} />
        <input placeholder="Visit notes" value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} className={`${inputCls} mt-2`} />
        <button disabled={busy} onClick={() => send({ action: "visit", siteVisitAt: visit ? new Date(visit).toISOString() : null, siteVisitNotes: visitNotes || undefined }, "Visit saved")} className={`${btnCls} mt-3`}>Save visit</button>
      </div>

      <div className={box}>
        <h3 className="mb-2 font-bold">Contract amount ({props.currency})</h3>
        <p className="mb-2 text-xs text-text-muted">Agreed with the customer after the visit. Servigic is the contracting party; pros are used for labour.</p>
        <input type="number" min={0} placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
        <label className="mt-2 block text-xs text-text-muted">Warranty days (problems fixed by Servigic)</label>
        <input type="number" min={0} value={warranty} onChange={(e) => setWarranty(e.target.value)} className={inputCls} />
        <button disabled={busy} onClick={() => send({ action: "amount", contractAmount: Number(amount) > 0 ? Number(amount) : null, warrantyDays: Number(warranty) >= 0 ? Number(warranty) : undefined }, "Amount saved")} className={`${btnCls} mt-3`}>Save amount</button>
      </div>

      <div className={box}>
        <h3 className="mb-2 font-bold">Note or call log</h3>
        <select value={kind} onChange={(e) => setKind(e.target.value as "note" | "call")} className={inputCls}><option value="note">Internal note</option><option value="call">Call log</option></select>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was said / decided (never shown to the customer)" className={`${inputCls} mt-2 py-2`} />
        <button disabled={busy || !note.trim()} onClick={() => send({ action: "note", kind, body: note }, "Saved").then(() => setNote(""))} className={`${btnCls} mt-3`}>Add</button>
      </div>
    </div>
  );
}
