"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [
  { country: "PK", label: "🇵🇰 PKR" },
  { country: "US", label: "🇺🇸 USD" },
  { country: "CA", label: "🇨🇦 CAD" },
  { country: "DE", label: "🇩🇪 EUR" },
  { country: "PL", label: "🇵🇱 PLN" },
  { country: "SA", label: "🇸🇦 SAR" },
  { country: "AE", label: "🇦🇪 AED" },
  { country: "QA", label: "🇶🇦 QAR" },
];

export function CurrencySwitcher({ current }: { current: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function setCountry(country: string) {
    await fetch("/api/market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <select
      value={current}
      onChange={(e) => setCountry(e.target.value)}
      disabled={pending}
      className="rounded-md border border-border-subtle bg-bg-elevated px-2.5 py-1 text-[13px] text-text-muted disabled:opacity-60"
    >
      {OPTIONS.map((o) => (
        <option key={o.country} value={o.country}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
