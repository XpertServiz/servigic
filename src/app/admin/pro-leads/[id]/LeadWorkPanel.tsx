"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const box = "w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent";

interface Props {
  id: string;
  phone: string;
  hideContact?: boolean;
  blocked: boolean;
  status: string;
  notes: string;
  followUp: string;
  consent: string;
  messages: { code: string; label: string; text: string; href: string }[];
  outcomes: { key: string; label: string }[];
}

// Work a lead: call / WhatsApp, then record the outcome, a note and the next follow-up date.
export function LeadWorkPanel({ id, phone, hideContact, blocked, notes, followUp, consent, messages, outcomes }: Props) {
  const router = useRouter();
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");
  const [next, setNext] = useState(followUp);
  const [kind, setKind] = useState<"CALL" | "WHATSAPP" | "NOTE">("CALL");
  const [busy, setBusy] = useState(false);
  const [msgLang, setMsgLang] = useState(messages[0]?.code ?? "rur");
  const msg = messages.find((m) => m.code === msgLang) ?? messages[0];

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/pro-leads/${id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, outcome: outcome || undefined, note: note || undefined, nextFollowUp: next ? new Date(`${next}T09:00:00.000Z`).toISOString() : null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Could not save.");
      toast.success("Saved");
      setNote("");
      setOutcome("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function patch(body: Record<string, unknown>, ok: string) {
    const res = await fetch(`/api/admin/pro-leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return toast.error("Could not save.");
    toast.success(ok);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this lead and its history completely? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/pro-leads/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      router.push("/admin/pro-leads");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {blocked ? (
        <div className="rounded-[14px] border border-danger/40 bg-danger/10 p-4 text-sm">
          <b className="text-danger">Do not contact.</b> This person asked not to be contacted. Call and WhatsApp are hidden and he is left out of every export.
          <div className="mt-2">
            <button type="button" onClick={() => patch({ doNotContact: false }, "Do-not-contact removed")} className="rounded-full border border-border-subtle px-3 py-1 text-xs">Remove the flag</button>
          </div>
        </div>
      ) : hideContact || !msg ? (
        <div className="rounded-[14px] border border-border-subtle p-4 text-sm text-text-muted">The phone number is hidden at your admin level, so Call and WhatsApp are not available. Ask a super admin or growth admin to contact this person.</div>
      ) : (
        <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <a href={`tel:${phone}`} onClick={() => setKind("CALL")} className="rounded-full border border-accent/50 px-5 py-2 text-sm font-semibold text-accent">Call</a>
            <a href={msg.href} target="_blank" rel="noopener noreferrer" onClick={() => setKind("WHATSAPP")} className="rounded-full bg-[#25D366] px-5 py-2 text-sm font-semibold text-[#06170d]">Open WhatsApp</a>
          </div>
          <div className="mb-2 flex gap-1 text-xs">
            {messages.map((m) => (
              <button key={m.code} type="button" onClick={() => setMsgLang(m.code)} className={`rounded-full border px-3 py-1 ${msgLang === m.code ? "border-accent text-accent" : "border-border-subtle text-text-muted"}`}>{m.label}</button>
            ))}
          </div>
          <p className="rounded-[10px] border border-border-subtle bg-bg p-3 text-sm leading-relaxed" dir="auto">{msg.text}</p>
          <p className="mt-1 text-xs text-text-muted">WhatsApp only opens with this message ready: you check it and press send yourself. Nothing is sent automatically.</p>
        </div>
      )}

      <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-4">
        <h2 className="mb-3 text-lg font-bold">Record what happened</h2>
        <div className="mb-3 flex gap-2 text-xs">
          {(["CALL", "WHATSAPP", "NOTE"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-full border px-3 py-1 ${kind === k ? "border-accent text-accent" : "border-border-subtle text-text-muted"}`}>{k === "CALL" ? "Call" : k === "WHATSAPP" ? "WhatsApp" : "Note only"}</button>
          ))}
        </div>
        <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={`${box} mb-3`}>
          <option value="">Outcome (optional)</option>
          {outcomes.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Note" className={`${box} mb-3`} />
        <label className="mb-3 block text-xs text-text-muted">
          Next follow-up
          <input type="date" value={next} onChange={(e) => setNext(e.target.value)} className={`${box} mt-1`} />
        </label>
        <button type="button" disabled={busy} onClick={save} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60">Save</button>
      </div>

      <div className="rounded-[14px] border border-border-subtle p-4 text-sm">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span className="text-text-muted">Consent: <b>{consent}</b></span>
          {consent !== "yes" && <button type="button" onClick={() => patch({ consent: "yes" }, "Consent recorded")} className="rounded-full border border-border-subtle px-3 py-1 text-xs">He agreed to be contacted</button>}
          {!blocked && <button type="button" onClick={() => patch({ doNotContact: true }, "Marked do not contact")} className="rounded-full border border-danger/50 px-3 py-1 text-xs text-danger">Do not contact (STOP)</button>}
        </div>
        <label className="block text-xs text-text-muted">
          Internal notes
          <textarea defaultValue={notes} onBlur={(e) => e.target.value !== notes && patch({ notes: e.target.value }, "Notes saved")} rows={3} className={`${box} mt-1`} />
        </label>
        <button type="button" onClick={remove} className="mt-3 text-xs text-danger underline">Delete this lead completely</button>
      </div>
    </div>
  );
}
