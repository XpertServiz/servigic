"use client";

import { useTranslations } from "next-intl";

/** Sets the expectation for new pros: identity verification and admin approval take up to 3 business days. */
export function ProPendingNotice({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const t = useTranslations("auth");
  return (
    <div role="note" className={`rounded-2xl border border-accent/40 bg-accent/10 p-4 ${className}`}>
      <div className="mb-1 flex items-center gap-2 text-sm font-bold text-accent">
        <span aria-hidden>⏳</span> {t("proPendingTitle")}
      </div>
      <p className="text-[13px] leading-relaxed text-text-muted">{compact ? t("proPendingShort") : t("proPendingBody")}</p>
    </div>
  );
}
