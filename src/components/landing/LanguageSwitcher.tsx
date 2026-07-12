"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/request";

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ur", label: "اردو" },
  { code: "ar", label: "عربي" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "pl", label: "Polski" },
];

export function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function setLocale(locale: Locale) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <select
      value={current}
      onChange={(e) => setLocale(e.target.value as Locale)}
      disabled={pending}
      className="rounded-md border border-border-subtle bg-bg-elevated px-2.5 py-1 text-[13px] text-text-muted disabled:opacity-60"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
