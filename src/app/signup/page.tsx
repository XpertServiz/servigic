"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { LLink } from "@/components/i18n/LLink";
import { AuthShell, authButton, authInput, authLabel } from "@/components/landing/AuthShell";
import { LIVE_CITIES as CITIES } from "@/lib/markets";

function SignupForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("cities");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "provider" ? "PROVIDER" : "CUSTOMER";

  const [role, setRole] = useState<"CUSTOMER" | "PROVIDER">(initialRole);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", city: CITIES[0] });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("somethingWrong"));
        return;
      }
      router.push(`/verify-otp?userId=${data.userId}`);
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  const roleBtn = (active: boolean) =>
    clsx("rounded-2xl border px-4 py-3 text-start transition-colors", active ? "border-accent bg-accent/10" : "border-border-subtle bg-bg-elevated hover:border-accent/40");

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">{t("createTitle")}</h1>
      <p className="mb-6 text-text-muted">{t("createSub")}</p>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setRole("CUSTOMER")} className={roleBtn(role === "CUSTOMER")} aria-pressed={role === "CUSTOMER"}>
          <div className="font-bold">{t("needService")}</div>
          <div className="text-xs text-text-muted">{t("needServiceSub")}</div>
        </button>
        <button type="button" onClick={() => setRole("PROVIDER")} className={roleBtn(role === "PROVIDER")} aria-pressed={role === "PROVIDER"}>
          <div className="font-bold">{t("imPro")}</div>
          <div className="text-xs text-text-muted">{t("imProSub")}</div>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className={authLabel}>
            {t("fullName")}
          </label>
          <input id="name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={authInput} />
        </div>
        <div>
          <label htmlFor="phone" className={authLabel}>
            {t("phone")}
          </label>
          <input id="phone" type="tel" required autoComplete="tel" placeholder="+92 300 1234567" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={authInput} />
          <p className="mt-1.5 text-xs text-text-muted">{t("phoneHint")}</p>
        </div>
        <div>
          <label htmlFor="email" className={authLabel}>
            {t("email")}
          </label>
          <input id="email" type="email" required autoComplete="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={authInput} />
        </div>
        <div>
          <label htmlFor="city" className={authLabel}>
            {t("city")}
          </label>
          <select id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={authInput}>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {tc.has(c) ? tc(c) : c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="password" className={authLabel}>
            {t("password")}
          </label>
          <input id="password" type="password" required autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={authInput} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className={authButton}>
          {pending ? t("creating") : t("createAccount")}
        </button>
      </form>

      <p className="mt-8 text-sm text-text-muted">
        {t("haveAccount")}{" "}
        <LLink href="/login" className="font-semibold text-accent">
          {t("login")}
        </LLink>
      </p>
    </>
  );
}

export default function SignupPage() {
  return (
    <AuthShell width={460}>
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
