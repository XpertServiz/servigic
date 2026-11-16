"use client";

import { useState } from "react";

export function RateBox({ token }: { token: string }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function send() {
    if (!stars) return setMsg("Please choose 1 to 5 stars.");
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/estimate/${token}/rate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: stars, comment: comment || undefined }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(data.error || "Something went wrong.");
      setDone(true);
    } finally {
      setBusy(false);
    }
  }
  if (done) return <p className="rounded-xl border border-secondary/30 bg-secondary/10 p-4 text-sm">Thank you for your feedback.</p>;
  return (
    <div className="rounded-[14px] border border-border-subtle p-4">
      <p className="mb-2 font-semibold">How was your project with Servigic?</p>
      <div className="mb-3 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setStars(n)} className={`min-h-[44px] min-w-[44px] text-3xl ${n <= stars ? "text-accent" : "text-text-muted"}`}>{n <= stars ? "★" : "☆"}</button>
        ))}
      </div>
      <textarea rows={3} maxLength={1000} placeholder="Tell us more (optional)" value={comment} onChange={(e) => setComment(e.target.value)} className="mb-3 w-full rounded-xl border border-border-subtle bg-bg-elevated-2 px-4 py-3 text-sm" />
      {msg && <p role="alert" className="mb-2 text-sm text-danger">{msg}</p>}
      <button disabled={busy} onClick={send} className="min-h-[44px] rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground disabled:opacity-60">Send rating</button>
    </div>
  );
}
