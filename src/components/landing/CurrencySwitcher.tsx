"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("common");
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
      aria-label={t("currency")}
      onChange={(e) => setCountry(e.target.value)}
      disabled={pending}
      className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] text-text-muted transition-colors hover:border-accent/50 disabled:opacity-60"
    >
      {OPTIONS.map((o) => (
        <option key={o.country} value={o.country}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
