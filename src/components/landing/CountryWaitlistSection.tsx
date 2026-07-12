"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eyebrow } from "@/components/landing/Eyebrow";

export function CountryWaitlistSection({ countryCode, countryName }: { countryCode: string; countryName: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/locales/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, email, name: name || undefined }),
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

  return (
    <section id="waitlist" className="mx-auto max-w-[700px] px-6 py-20 text-center">
      <Eyebrow>Coming Soon to {countryName}</Eyebrow>
      <h2 className="mb-4 font-display text-[clamp(28px,4.5vw,44px)] font-bold uppercase leading-tight">
        Be first when we launch here.
      </h2>
      <p className="mb-8 text-text-muted">
        Servigic isn&apos;t live in {countryName} yet — no local pros or payment methods are wired up here. Leave
        your email and we&apos;ll notify you the moment it is.
      </p>

      {submitted ? (
        <div className="rounded-[14px] border border-secondary/30 bg-secondary/10 p-6 text-secondary">
          You&apos;re on the list — we&apos;ll email you when Servigic launches in {countryName}. 🎉
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <input
            required
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 text-sm text-text outline-none focus:border-accent"
          />
          <input
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 text-sm text-text outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-[10px] bg-accent px-6 py-3 font-bold text-accent-foreground disabled:opacity-60"
          >
            {pending ? "Joining…" : "Join Waitlist"}
          </button>
        </form>
      )}
    </section>
  );
}
