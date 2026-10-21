"use client";

import { PasswordInput } from "@/components/ui/PasswordInput";
import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { LLink } from "@/components/i18n/LLink";
import { AuthShell, authButton, authInput, authLabel } from "@/components/landing/AuthShell";
import { loginAction, type LoginState } from "./actions";
import type { AuthContext } from "@/lib/authContext";

function LoginInner({ ctx }: { ctx: AuthContext }) {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/post-login";
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);
  // A number can hold a customer and a pro account: the pills say which one to open (ignored when it has only one).
  const [role, setRole] = useState<"CUSTOMER" | "PROVIDER">(searchParams.get("role") === "provider" || callbackUrl.startsWith("/pro") ? "PROVIDER" : "CUSTOMER");
  const country = ctx.countries.find((c) => c.code === ctx.selected) ?? ctx.countries[0];
  const pill = (active: boolean) => clsx("flex-1 rounded-full border px-4 py-2 text-sm font-semibold transition-colors", active ? "border-accent bg-accent/10 text-accent" : "border-border-subtle text-text-muted hover:border-accent/40");

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold tracking-[-0.018em]">{t("welcome")}</h1>
      <p className="mb-6 text-text-muted">{t("welcomeSub")}</p>

      {searchParams.get("linked") === "1" && <p role="status" className="mb-4 rounded-xl border border-secondary/40 bg-secondary/10 p-3 text-sm text-secondary">{t("linkedDone")}</p>}
      {searchParams.get("reset") === "1" && <p role="status" className="mb-4 rounded-xl border border-secondary/40 bg-secondary/10 p-3 text-sm text-secondary">{t("resetDone")}</p>}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="country" value={country?.code ?? "PK"} />
        <div className="flex gap-2" role="group" aria-label="Account type">
          <button type="button" onClick={() => setRole("CUSTOMER")} className={pill(role === "CUSTOMER")} aria-pressed={role === "CUSTOMER"}>
            {t("loginAsCustomer")}
          </button>
          <button type="button" onClick={() => setRole("PROVIDER")} className={pill(role === "PROVIDER")} aria-pressed={role === "PROVIDER"}>
            {t("loginAsPro")}
          </button>
        </div>
        <div>
          <label htmlFor="phone" className={authLabel}>
            {t("phone")}
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" required placeholder={country?.phoneExample ?? "+1 555 123 4567"} dir="ltr" className={authInput} />
        </div>
        <div>
          <label htmlFor="password" className={authLabel}>
            {t("password")}
          </label>
          <PasswordInput id="password" name="password" autoComplete="current-password" required className={authInput} />
          <div className="mt-2 text-end">
            <LLink href="/forgot-password" className="text-sm font-semibold text-accent">
              {t("forgotPassword")}
            </LLink>
          </div>
        </div>
        {state?.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error === "BAD_CREDENTIALS" ? t("badCredentials") : state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className={authButton}>
          {pending ? t("loggingIn") : t("login")}
        </button>
      </form>

      <p className="mt-8 text-sm text-text-muted">
        {t("noAccount")}{" "}
        <LLink href={`/signup?role=${role === "PROVIDER" ? "provider" : "customer"}`} className="font-semibold text-accent">
          {t("signUp")}
        </LLink>
      </p>
    </>
  );
}

export function LoginForm({ ctx }: { ctx: AuthContext }) {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <LoginInner ctx={ctx} />
      </Suspense>
    </AuthShell>
  );
}
