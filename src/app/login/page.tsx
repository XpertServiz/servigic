"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LLink } from "@/components/i18n/LLink";
import { AuthShell, authButton, authInput, authLabel } from "@/components/landing/AuthShell";
import { loginAction, type LoginState } from "./actions";

function LoginForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/post-login";
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">{t("welcome")}</h1>
      <p className="mb-8 text-text-muted">{t("welcomeSub")}</p>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div>
          <label htmlFor="phone" className={authLabel}>
            {t("phone")}
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" required placeholder="+92 300 1234567" dir="ltr" className={authInput} />
        </div>
        <div>
          <label htmlFor="password" className={authLabel}>
            {t("password")}
          </label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className={authInput} />
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
        <LLink href="/signup?role=customer" className="font-semibold text-accent">
          {t("signUp")}
        </LLink>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
