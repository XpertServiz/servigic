"use client";

import { PasswordInput } from "@/components/ui/PasswordInput";
import { Suspense, useMemo, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { clsx } from "clsx";
import { LLink } from "@/components/i18n/LLink";
import { AuthShell, authButton, authInput, authLabel } from "@/components/landing/AuthShell";
import { ProPendingNotice } from "@/components/auth/ProPendingNotice";
import { cityName } from "@/lib/countryProfile";
import { AcceptAgreement, type TermsAcceptance } from "@/components/legal/AcceptAgreement";
import type { AuthContext } from "@/lib/authContext";

function SignupInner({ ctx }: { ctx: AuthContext }) {
  const t = useTranslations("auth");
  const tl = useTranslations("legal");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "provider" ? "PROVIDER" : "CUSTOMER";

  const known = ctx.countries.some((c) => c.code === ctx.selected);
  const firstCountry = ctx.countries.find((c) => c.code === ctx.selected) ?? ctx.countries[0];
  const [role, setRole] = useState<"CUSTOMER" | "PROVIDER">(initialRole);
  const [country, setCountry] = useState(known ? ctx.selected : (firstCountry?.code ?? "PK"));
  const current = useMemo(() => ctx.countries.find((c) => c.code === country) ?? firstCountry, [ctx.countries, country, firstCountry]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", confirmPassword: "", city: current?.cities[0] ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Pro: the trades he works in (every category, including ones an admin created).
  const [trades, setTrades] = useState<string[]>([]);
  const [tradeOptions, setTradeOptions] = useState<{ trade: string; name: string; icon: string }[]>([]);
  useEffect(() => {
    fetch("/api/mobile/trades").then((r) => r.json()).then((d) => setTradeOptions(d.trades ?? [])).catch(() => {});
  }, []);
  const toggleTrade = (x: string) => setTrades((cur) => (cur.includes(x) ? cur.filter((y) => y !== x) : cur.length >= 3 ? cur : [...cur, x]));
  // The e-signed acceptance of the Customer Terms / Pro Agreement for the chosen country; no account without it.
  const [terms, setTerms] = useState<TermsAcceptance | null>(null);

  function pickCountry(code: string) {
    setCountry(code);
    const next = ctx.countries.find((c) => c.code === code);
    setForm((f) => ({ ...f, city: next?.cities[0] ?? "" }));
  }

  const roleWord = (r: string | undefined) => (r === "PROVIDER" ? t("rolePro") : t("roleCustomer"));

  function messageFor(data: { code?: string; error?: string; existingRole?: string }): string {
    const other = data.existingRole;
    switch (data.code) {
      case "PHONE_EXISTS_SAME_ROLE":
        return t("errPhoneExistsSame", { role: roleWord(other) });
      case "PHONE_EXISTS_OTHER_ROLE":
        return t("errPhoneExistsOther", { role: roleWord(other), want: roleWord(role) });
      case "EMAIL_EXISTS":
        return t("errEmailExists", { role: roleWord(role) });
      case "INVALID_PHONE":
        return t("errInvalidPhone");
      case "RATE_LIMITED":
        return t("errRateLimited");
      case "PASSWORD_MISMATCH":
        return t("passwordMismatch");
      case "SERVER_ERROR":
        return t("errServer");
      case "TERMS_REQUIRED":
      case "TERMS_OUTDATED":
        return tl("required");
      default:
        return data.error || t("somethingWrong");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (!terms) {
      setError(tl("required"));
      return;
    }
    if (role === "PROVIDER" && trades.length === 0) {
      setError("Please pick the work you do (up to 3).");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role, country, terms, ...(role === "PROVIDER" ? { trades } : {}) }),
      });
      // The server always answers with JSON; if it does not (a proxy error page), say so instead of "network error".
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data ? messageFor(data) : t("errServer"));
        return;
      }
      if (data.verified) {
        // Second role on a number that was already verified: nothing to confirm, just log in.
        router.push(`/login?role=${role === "PROVIDER" ? "provider" : "customer"}&linked=1`);
        return;
      }
      router.push(`/verify-otp?userId=${data.userId}&role=${role === "PROVIDER" ? "provider" : "customer"}`);
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  const roleBtn = (active: boolean) =>
    clsx("rounded-2xl border px-4 py-3 text-start transition-colors", active ? "border-accent bg-accent/10" : "border-border-subtle bg-bg-elevated hover:border-accent/40");
  const cities = current?.cities ?? [];

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold tracking-[-0.018em]">{t("createTitle")}</h1>
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

      {role === "PROVIDER" && <ProPendingNotice className="mb-6" />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className={authLabel}>
            {t("fullName")}
          </label>
          <input id="name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={authInput} />
        </div>
        <div>
          <label htmlFor="country" className={authLabel}>
            {t("country")}
          </label>
          <select id="country" value={country} onChange={(e) => pickCountry(e.target.value)} className={authInput}>
            {ctx.countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.dial})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="phone" className={authLabel}>
            {t("phone")}
          </label>
          <input
            id="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder={current?.phoneExample ?? "+1 555 123 4567"}
            dir="ltr"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={authInput}
          />
          <p className="mt-1.5 text-xs text-text-muted" dir="ltr">
            {current?.dial} …
          </p>
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
          {cities.length > 0 ? (
            <select id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={authInput}>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {cityName(c, locale)}
                </option>
              ))}
            </select>
          ) : (
            <input id="city" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={authInput} />
          )}
        </div>
        <div>
          <label htmlFor="password" className={authLabel}>
            {t("password")}
          </label>
          <PasswordInput id="password" required autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={authInput} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className={authLabel}>
            {t("confirmPassword")}
          </label>
          <PasswordInput id="confirmPassword" required autoComplete="new-password" minLength={8} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className={authInput} />
          {form.confirmPassword && form.confirmPassword !== form.password && <p className="mt-1.5 text-xs text-danger">{t("passwordMismatch")}</p>}
        </div>
        {role === "PROVIDER" && (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-muted">What work do you do? (pick up to 3)</label>
            <div className="flex flex-wrap gap-2">
              {tradeOptions.map((x) => {
                const on = trades.includes(x.trade);
                return (
                  <button
                    key={x.trade}
                    type="button"
                    onClick={() => toggleTrade(x.trade)}
                    aria-pressed={on}
                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${on ? "border-accent bg-accent text-accent-foreground" : "border-border-subtle text-text-muted"}`}
                  >
                    {x.icon} {x.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-text-muted">An admin approves your trades together with your documents.</p>
          </div>
        )}
        <AcceptAgreement key={`${role}-${country}`} role={role} country={country} name={form.name} onChange={setTerms} />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending || !terms} className={authButton}>
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

export function SignupForm({ ctx }: { ctx: AuthContext }) {
  return (
    <AuthShell width={460}>
      <Suspense fallback={null}>
        <SignupInner ctx={ctx} />
      </Suspense>
    </AuthShell>
  );
}
