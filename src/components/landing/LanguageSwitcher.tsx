"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LOCALES, isMarketingPath, localeMeta, localizePath, splitLocalePath, type Locale } from "@/i18n/locales";

export function LanguageSwitcher({ current, dropUp = false }: { current: Locale; dropUp?: boolean }) {
  const t = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function choose(locale: Locale) {
    setOpen(false);
    if (locale === current) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    }).catch(() => {});
    const { path } = splitLocalePath(window.location.pathname);
    const target = isMarketingPath(path) ? `${localizePath(path, locale)}${window.location.search}${window.location.hash}` : null;
    startTransition(() => {
      if (target) router.push(target);
      else router.refresh();
    });
  }

  const meta = localeMeta(current);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language")}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] font-medium text-text-muted transition-colors hover:border-accent/50 hover:text-text disabled:opacity-60"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.8 2.6 4.2 5.6 4.2 9S14.8 18.4 12 21c-2.8-2.6-4.2-5.6-4.2-9S9.2 5.6 12 3Z" />
        </svg>
        {meta.native}
      </button>
      {open && (
        <ul
          role="listbox"
          className={`sv-glass absolute end-0 z-50 max-h-[320px] w-48 overflow-auto rounded-2xl p-1.5 shadow-2xl ${dropUp ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          {LOCALES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === current}
                lang={l.code}
                dir={l.dir}
                onClick={() => choose(l.code)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-sm transition-colors hover:bg-white/[0.06] ${l.code === current ? "text-accent" : "text-text"}`}
              >
                <span>{l.native}</span>
                {l.code === current && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
