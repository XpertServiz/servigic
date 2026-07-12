"use client";

import { useState } from "react";
import { toast } from "sonner";

export function WaitlistForm() {
  const [form, setForm] = useState({ companyName: "", contactName: "", phone: "", email: "", unitCount: "", city: "" });
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/business/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, unitCount: form.unitCount ? Number(form.unitCount) : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to join waitlist");
        return;
      }
      setSubmitted(true);
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-[14px] border border-secondary/30 bg-secondary/10 p-6 text-center text-secondary">
        Thanks — we&apos;ll be in touch when Servigic for Business is ready for your portfolio. 🎉
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input
          required
          placeholder="Company name"
          value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          className="rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-4 py-3 text-sm text-text outline-none focus:border-accent"
        />
        <input
          required
          placeholder="Your name"
          value={form.contactName}
          onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          className="rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-4 py-3 text-sm text-text outline-none focus:border-accent"
        />
        <input
          required
          placeholder="Phone number"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-4 py-3 text-sm text-text outline-none focus:border-accent"
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-4 py-3 text-sm text-text outline-none focus:border-accent"
        />
        <input
          type="number"
          placeholder="Number of units (optional)"
          value={form.unitCount}
          onChange={(e) => setForm({ ...form, unitCount: e.target.value })}
          className="rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-4 py-3 text-sm text-text outline-none focus:border-accent"
        />
        <input
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="rounded-[10px] border border-border-subtle bg-bg-elevated-2 px-4 py-3 text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] bg-accent px-6 py-3.5 font-bold text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Joining…" : "Join the Waitlist"}
      </button>
    </form>
  );
}
