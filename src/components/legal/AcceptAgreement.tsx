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
 * Accept-and-sign step of the sign-up form (and of the gate for existing accounts): the complete Customer Terms or Pro
 * Agreement of the user's country, readable in full, with "I Agree" and "I Don't Agree" at the end of it. Only "I Agree" and
 * the full name typed as the electronic signature let the account be created. Calls `onChange` with what to send, or null.
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
  const [decision, setDecision] = useState<"agree" | "disagree" | null>(null);
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
    onChange(doc && decision === "agree" && signature.trim().length >= 2 ? { version: doc.version, hash: doc.hash, signedName: signature.trim(), locale } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, decision, signature, locale]);

  if (!doc) return <div className="h-24 animate-pulse rounded-2xl bg-bg-elevated" aria-hidden />;

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-elevated p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold">
        <span aria-hidden>📝</span> {t("heading")}
      </div>
      <p className="mb-3 text-xs text-text-muted">{t("readToContinue")}</p>

      {/* The complete agreement, with the decision at its end */}
      <div className="max-h-80 overflow-y-auto rounded-xl border border-border-subtle bg-bg p-3">
        <AgreementBody doc={doc} compact />
        {locale !== "en" && <p className="mt-3 text-[11.5px] text-text-muted">{t("englishNote")}</p>}
        <div className="mt-4 rounded-xl border border-accent/40 p-3">
          <p className="mb-3 text-[13px] leading-snug">{t("agree", { title: doc.title })}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setDecision("agree")} className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold ${decision === "agree" ? "bg-secondary text-black" : "border border-secondary text-secondary"}`}>
              {decision === "agree" ? "✓ " : ""}
              {t("iAgree")}
            </button>
            <button type="button" onClick={() => setDecision("disagree")} className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold ${decision === "disagree" ? "bg-danger text-white" : "border border-danger text-danger"}`}>
              {t("iDisagree")}
            </button>
          </div>
        </div>
      </div>

      {decision === "disagree" && <p className="mt-3 text-[13px] text-danger">{t("disagreed")}</p>}
      {decision === "agree" && (
        <div className="mt-3">
          <p className="mb-2 text-[13px] font-semibold text-secondary">✓ {t("agreed", { title: doc.title })}</p>
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
        </div>
      )}
      <a href={`/legal/agreement?role=${role}&country=${doc.country}`} target="_blank" rel="noopener" className="mt-2 inline-block text-[12px] text-accent underline-offset-2 hover:underline">
        {t("download")}
      </a>
    </div>
  );
}
