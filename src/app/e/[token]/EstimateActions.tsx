"use client";

import { useState } from "react";

export function EstimateActions({ token }: { token: string }) {
  const [comment, setComment] = useState("");
  const [mode, setMode] = useState<"" | "revise" | "decline">("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function send(action: "accept" | "revise" | "decline") {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/projects/estimate/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, comment: comment || undefined }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(data.error || "Something went wrong.");
      setDone(true);
      setMsg(action === "accept" ? "Thank you. Servigic will contact you to start the work." : "Thank you. Servigic will contact you shortly.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="rounded-xl border border-secondary/30 bg-secondary/10 p-4 text-sm">{msg}</p>;
  return (
    <div className="flex flex-col gap-3">
      <button disabled={busy} onClick={() => send("accept")} className="min-h-[48px] rounded-full bg-gradient-to-b from-[#ffc24a] to-accent px-6 font-semibold text-accent-foreground disabled:opacity-60">Accept this estimate</button>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setMode("revise")} className="min-h-[44px] rounded-full border border-border-subtle px-5 text-sm font-semibold">Ask for changes</button>
        <button onClick={() => setMode("decline")} className="min-h-[44px] rounded-full border border-border-subtle px-5 text-sm font-semibold text-text-muted">Decline</button>
        <button onClick={() => window.print()} className="min-h-[44px] rounded-full border border-border-subtle px-5 text-sm font-semibold text-text-muted">Print / save PDF</button>
      </div>
      {mode && (
        <>
          <textarea rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={mode === "revise" ? "What should change?" : "Why are you declining? (optional)"} className="w-full rounded-xl border border-border-subtle bg-bg-elevated-2 px-4 py-3 text-sm" />
          <button disabled={busy || (mode === "revise" && !comment.trim())} onClick={() => send(mode)} className="min-h-[44px] self-start rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground disabled:opacity-60">Send</button>
        </>
      )}
      {msg && <p role="alert" className="text-sm text-danger">{msg}</p>}
    </div>
  );
}
