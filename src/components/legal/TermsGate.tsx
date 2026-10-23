"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AcceptAgreement, type TermsAcceptance } from "./AcceptAgreement";
import type { AgreementDoc } from "./AgreementBody";

/**
 * For a signed-in customer or pro who has not e-signed the current agreement of their country (an account made before
 * e-signing existed, or a new version): a blocking window with the agreement until it is accepted.
 */
export function TermsGate({ role, name }: { role: "CUSTOMER" | "PROVIDER"; name: string }) {
  const t = useTranslations("legal");
  const [pending, setPending] = useState<AgreementDoc | null>(null);
  const [value, setValue] = useState<TermsAcceptance | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/legal/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setPending(d.pending ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!pending) return null;

  async function accept() {
    if (!value) return setError(t("required"));
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/legal/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (d.agreement) setPending(d.agreement);
        return setError(d.error ?? t("required"));
      }
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-t-3xl bg-bg p-5 sm:rounded-3xl">
        <h2 className="mb-1 text-xl font-bold">{t("gateTitle")}</h2>
        <p className="mb-4 text-sm text-text-muted">{t("gateBody", { country: pending.countryName })}</p>
        <AcceptAgreement role={role} name={name} onChange={setValue} preloaded={pending} />
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <button type="button" onClick={accept} disabled={!value || busy} className="mt-4 w-full rounded-full bg-accent px-5 py-3 font-bold text-accent-foreground disabled:opacity-50">
          {busy ? "…" : t("acceptButton")}
        </button>
      </div>
    </div>
  );
}
