"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AuthShell, authButton } from "@/components/landing/AuthShell";
import { ProPendingNotice } from "@/components/auth/ProPendingNotice";

function VerifyForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") || "";
  const isPro = searchParams.get("role") === "provider";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("verifyFailed"));
        return;
      }
      router.push(`/login?role=${isPro ? "provider" : "customer"}`);
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    setResent(false);
    await fetch("/api/auth/otp/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setResent(true);
  }

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold tracking-[-0.018em]">{t("verifyTitle")}</h1>
      <p className="mb-6 text-text-muted">{t("verifySub")}</p>
      {isPro && <ProPendingNotice className="mb-6" />}

      <form onSubmit={handleVerify} className="flex flex-col items-center gap-4">
        <input
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          dir="ltr"
          aria-label={t("verifySub")}
          className="w-52 rounded-xl border border-border-subtle bg-bg-elevated-2 px-4 py-3 text-center text-2xl tracking-[0.4em] text-text outline-none transition-colors focus:border-accent"
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending || code.length !== 6} className={`${authButton} w-full`}>
          {pending ? t("verifying") : t("verify")}
        </button>
      </form>

      <button onClick={handleResend} className="mt-6 text-sm font-semibold text-accent">
        {resent ? t("resent") : t("resend")}
      </button>
    </>
  );
}

export default function VerifyOtpPage() {
  return (
    <AuthShell center>
      <Suspense fallback={null}>
        <VerifyForm />
      </Suspense>
    </AuthShell>
  );
}
