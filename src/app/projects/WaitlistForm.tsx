"use client";

import { useState } from "react";
import { PROJECT_TRADES, WAITLIST_COUNTRIES } from "@/lib/bigProjectsOptions";

const inputCls = "w-full rounded-xl border border-border-subtle bg-bg-elevated-2 px-4 py-3 text-sm text-text outline-none transition-colors focus:border-accent";

// For visitors outside Pakistan: Big Projects is Pakistan-only for now; they leave their details and we tell them when it opens in their country.
export function WaitlistForm() {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ country: "", city: "", name: "", email: "", phone: "", notes: "", website: "" });
  const [trades, setTrades] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.country || f.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError("Please choose your country and enter your name and email.");
    setPending(true);
    try {
      const res = await fetch("/api/projects/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, name: f.name.trim(), email: f.email.trim(), city: f.city.trim() || undefined, phone: f.phone.trim() || undefined, notes: f.notes.trim() || undefined, trades, language: document.documentElement.lang || "en" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error === "rate" ? "Too many requests. Please try again later." : "Something went wrong. Please check the details.");
      setDone(true);
    } finally {
      setPending(false);
    }
  }

  if (done) return <p className="mt-6 rounded-xl border border-secondary/30 bg-secondary/10 p-4 text-center text-sm" role="status">Thank you. You are on the list - we will email you when Big Projects opens in your country.</p>;
  if (!open) return <p className="mt-6 text-center text-sm text-text-muted">Not in Pakistan? <button type="button" onClick={() => setOpen(true)} className="font-semibold text-accent underline">Join the waitlist for your country</button></p>;
  return (
    <form onSubmit={submit} id="waitlist" className="sv-card mt-6 flex flex-col gap-4 p-5 md:p-7">
      <div>
        <h3 className="text-lg font-bold">Big Projects is coming to more countries</h3>
        <p className="text-sm text-text-muted">Right now we work in Pakistan only. Leave your details and we will tell you first.</p>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} className="hidden" aria-hidden />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select value={f.country} onChange={(e) => set("country", e.target.value)} className={inputCls} aria-label="Country">
          <option value="">Country</option>
          {WAITLIST_COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
        <input placeholder="City" value={f.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
        <input placeholder="Your name" value={f.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        <input type="email" dir="ltr" placeholder="Email" value={f.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
        <input type="tel" dir="ltr" placeholder="Phone / WhatsApp (optional)" value={f.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
      </div>
      <div className="flex flex-wrap gap-2">
        {PROJECT_TRADES.map(([k, l]) => (
          <button type="button" key={k} aria-pressed={trades.includes(k)} onClick={() => setTrades((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]))} className={`min-h-[40px] rounded-full border px-3 text-xs transition-colors ${trades.includes(k) ? "border-accent bg-accent/15 text-accent" : "border-border-subtle text-text-muted"}`}>{l}</button>
        ))}
      </div>
      <textarea rows={3} maxLength={500} placeholder="What kind of project? (optional)" value={f.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={pending} className="min-h-[44px] rounded-full bg-gradient-to-b from-[#ffc24a] to-accent px-6 font-semibold text-accent-foreground disabled:opacity-60">{pending ? "Sending..." : "Join the waitlist"}</button>
    </form>
  );
}
