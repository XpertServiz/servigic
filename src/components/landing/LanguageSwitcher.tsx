"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/request";

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ur", label: "اردو" },
  { code: "ar", label: "عربي" },
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
    <div className="flex gap-2">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLocale(lang.code)}
          disabled={pending}
          className={`rounded-md border px-2.5 py-1 disabled:opacity-60 ${
            current === lang.code ? "border-accent text-accent" : "border-border-subtle text-text-muted"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
