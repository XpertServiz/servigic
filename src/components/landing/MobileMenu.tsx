"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LLink } from "@/components/i18n/LLink";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { Locale } from "@/i18n/locales";

export function MobileMenu({
  current,
  links,
  cta,
  labels,
}: {
  current: Locale;
  links: { href: string; label: string }[];
  cta: { href: string; label: string };
  labels: { open: string; close: string };
}) {
  // The menu is open only for the page it was opened on, so navigating closes it.
  const pathname = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (fn: (o: boolean) => boolean) => setOpenFor(fn(open) ? pathname : null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? labels.close : labels.open}
        className="relative z-[60] grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04]"
      >
        <span className="sr-only">{open ? labels.close : labels.open}</span>
        <span aria-hidden className="relative block h-3.5 w-5">
          <span className={`absolute inset-x-0 top-0 h-0.5 rounded bg-text transition-transform duration-300 ${open ? "translate-y-[6px] rotate-45" : ""}`} />
          <span className={`absolute inset-x-0 top-[6px] h-0.5 rounded bg-text transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
          <span className={`absolute inset-x-0 bottom-0 h-0.5 rounded bg-text transition-transform duration-300 ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
        </span>
      </button>

      <div
        id="mobile-menu"
        className={`fixed inset-0 z-[55] flex flex-col overflow-hidden bg-bg/95 px-6 pb-8 pt-24 backdrop-blur-2xl transition-all duration-300 ${open ? "visible opacity-100" : "invisible opacity-0"}`}
      >
        <div className="sv-glow pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 opacity-60" aria-hidden />
        <ul className="relative flex flex-col">
          {links.map((l, i) => (
            <li key={l.href} style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }} className={`border-b border-white/[0.06] transition-all duration-500 ${open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
              <LLink href={l.href} className="flex items-center justify-between py-4 text-2xl font-semibold">
                {l.label}
                <span aria-hidden className="text-accent rtl:rotate-180">→</span>
              </LLink>
            </li>
          ))}
        </ul>
        <div className="relative mt-auto flex flex-col gap-4">
          <Button href={cta.href} size="lg" className="w-full">
            {cta.label}
          </Button>
          <div className="flex justify-center">
            <LanguageSwitcher current={current} dropUp />
          </div>
        </div>
      </div>
    </div>
  );
}
