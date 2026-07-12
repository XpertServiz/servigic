"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginAction, type LoginState } from "./actions";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/post-login";
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="mb-8 flex items-center gap-2.5 font-display text-xl font-bold">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-[#ff8a20] font-extrabold text-accent-foreground">
            S
          </span>
          Servigic
        </Link>
        <h1 className="mb-2 font-display text-3xl font-bold">Welcome back</h1>
        <p className="mb-8 text-text-muted">Log in to manage your jobs, bids, or dispatch feed.</p>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-muted">Phone number</label>
            <input
              name="phone"
              type="tel"
              required
              placeholder="03001234567"
              className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 text-text outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-muted">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 text-text outline-none focus:border-accent"
            />
          </div>
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-[10px] bg-accent px-6 py-3.5 font-bold text-accent-foreground transition-opacity disabled:opacity-60"
          >
            {pending ? "Logging in…" : "Log In"}
          </button>
        </form>

        <p className="mt-8 text-sm text-text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup?role=customer" className="font-semibold text-accent">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
