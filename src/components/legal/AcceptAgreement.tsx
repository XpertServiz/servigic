"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AgreementBody, type AgreementDoc } from "./AgreementBody";

export interface TermsAcceptance {
  version: string;
  hash: string;
  signedName: string;
  locale: string;
}

/**
 * Accept-and-sign block of the sign-up form (and of the gate for existing accounts): the key points of the Customer Terms or
 * Pro Agreement for the user's country, the full text on demand, an "I agree" box and the full name typed as the electronic
 * signature. Calls `onChange` with what to send to the server once everything is done, or null.
 */
export function AcceptAgreement({
  role,
  country,
  name,
  onChange,
  preloaded,
}: {
  role: "CUSTOMER" | "PROVIDER";
  country?: string;
  name: string;
  onChange: (value: TermsAcceptance | null) => void;
  preloaded?: AgreementDoc | null;
}) {
  const t = useTranslations("legal");
  const locale = useLocale();
  const [doc, setDoc] = useState<AgreementDoc | null>(preloaded ?? null);
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  // The signature follows the name typed above until the person edits it.
  const [sigOverride, setSigOverride] = useState<string | null>(null);
  const signature = sigOverride ?? name;

  useEffect(() => {
    if (preloaded) return;
    let alive = true;
    fetch(`/api/legal/agreement?role=${role}${country ? `&country=${country}` : ""}`)
      .then((r) => r.json())
      .then((d) => alive && setDoc(d.agreement ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [role, country, preloaded]);

  useEffect(() => {
    onChange(doc && agreed && signature.trim().length >= 2 ? { version: doc.version, hash: doc.hash, signedName: signature.trim(), locale } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, agreed, signature, locale]);

  if (!doc) return <div className="h-24 animate-pulse rounded-2xl bg-bg-elevated" aria-hidden />;

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-elevated p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold">
        <span aria-hidden>📝</span> {t("heading")}
      </div>
      <p className="mb-2 text-[13px] font-semibold" dir="ltr">
        {doc.title}
      </p>
      <ul className="mb-3 list-disc space-y-1 ps-5 text-[12.5px] leading-relaxed text-text-muted" dir="ltr" lang="en">
        {doc.summary.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <button type="button" onClick={() => setOpen((o) => !o)} className="mb-3 text-[13px] font-semibold text-accent underline-offset-2 hover:underline">
        {open ? t("hideFull") : t("readFull")}
      </button>
      {open && (
        <div className="mb-3 max-h-72 overflow-y-auto rounded-xl border border-border-subtle bg-bg p-3">
          <AgreementBody doc={doc} compact />
        </div>
      )}
      {locale !== "en" && <p className="mb-3 text-[11.5px] text-text-muted">{t("englishNote")}</p>}

      <label className="mb-3 flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-accent,#f5a623)]" />
        <span>{t("agree", { title: doc.title })}</span>
      </label>
      <label className="mb-1 block text-xs font-semibold text-text-muted" htmlFor="sv-signature">
        {t("signLabel")}
      </label>
      <input
        id="sv-signature"
        value={signature}
        onChange={(e) => setSigOverride(e.target.value)}
        className="w-full rounded-[10px] border border-border-subtle bg-bg px-4 py-2.5 font-[family-name:var(--font-hand)] text-xl outline-none focus:border-accent"
        autoComplete="name"
      />
      <p className="mt-1.5 text-[11.5px] text-text-muted">{t("signNote")}</p>
      <a href={`/legal/agreement?role=${role}&country=${doc.country}`} target="_blank" rel="noopener" className="mt-2 inline-block text-[12px] text-accent underline-offset-2 hover:underline">
        {t("download")}
      </a>
    </div>
  );
}
