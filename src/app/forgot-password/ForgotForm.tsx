"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { LLink } from "@/components/i18n/LLink";
import { AuthShell, authButton, authInput, authLabel } from "@/components/landing/AuthShell";
import type { AuthContext } from "@/lib/authContext";

// Forgot password, in two steps on one page: the number gets a 6-digit code (WhatsApp / SMS / email), then the code and the
// new password (typed twice) are sent together. The new password applies to every account on that number.
export function ForgotForm({ ctx }: { ctx: AuthContext }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const country = ctx.countries.find((c) => c.code === ctx.selected) ?? ctx.countries[0];
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, country: country?.code }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.code === "RATE_LIMITED" ? t("errRateLimited") : t("errServer"));
        return;
      }
      setInfo(t("codeSent"));
      setStep("code");
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, country: country?.code, code, password, confirmPassword }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.code === "BAD_CODE" ? t("resetBadCode") : data?.code === "RATE_LIMITED" ? t("errRateLimited") : data?.error || t("errServer"));
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="mb-2 text-3xl font-bold tracking-[-0.018em]">{t("forgotTitle")}</h1>
      <p className="mb-6 text-text-muted">{t("forgotSub")}</p>

      {step === "phone" ? (
        <form onSubmit={send} className="flex flex-col gap-4">
          <div>
            <label htmlFor="phone" className={authLabel}>
              {t("phone")}
            </label>
            <input id="phone" type="tel" required autoComplete="tel" placeholder={country?.phoneExample} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className={authInput} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending} className={authButton}>
            {t("sendCode")}
          </button>
        </form>
      ) : (
        <form onSubmit={reset} className="flex flex-col gap-4">
          {info && <p role="status" className="text-sm text-secondary">{info}</p>}
          <div>
            <label htmlFor="code" className={authLabel}>
              {t("codeLabel")}
            </label>
            <input id="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className={`${authInput} text-center text-xl tracking-[0.4em]`} />
          </div>
          <div>
            <label htmlFor="newPassword" className={authLabel}>
              {t("newPassword")}
            </label>
            <PasswordInput id="newPassword" required autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={authInput} />
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className={authLabel}>
              {t("confirmPassword")}
            </label>
            <PasswordInput id="confirmNewPassword" required autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={authInput} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending || code.length !== 6} className={authButton}>
            {t("resetPassword")}
          </button>
        </form>
      )}

      <p className="mt-8 text-sm">
        <LLink href="/login" className="font-semibold text-accent">
          {t("backToLogin")}
        </LLink>
      </p>
    </AuthShell>
  );
}
