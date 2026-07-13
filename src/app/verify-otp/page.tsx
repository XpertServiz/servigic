"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") || "";

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
        setError(data.error || "Verification failed");
        return;
      }
      router.push("/login");
    } catch {
      setError("Network error — please try again");
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
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-[420px] text-center">
        <Link href="/" className="mb-8 inline-flex items-center gap-2.5 font-display text-xl font-bold">
          <Image src="/logo.png" alt="Servigic" width={34} height={34} className="rounded-[9px]" />
          Servigic
        </Link>
        <h1 className="mb-2 font-display text-3xl font-bold">Verify your phone</h1>
        <p className="mb-8 text-text-muted">Enter the 6-digit code we sent to your phone.</p>

        <form onSubmit={handleVerify} className="flex flex-col items-center gap-4">
          <input
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-48 rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 text-center text-2xl tracking-[0.4em] text-text outline-none focus:border-accent"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending || code.length !== 6}
            className="w-full rounded-[10px] bg-accent px-6 py-3.5 font-bold text-accent-foreground disabled:opacity-60"
          >
            {pending ? "Verifying…" : "Verify"}
          </button>
        </form>

        <button onClick={handleResend} className="mt-6 text-sm font-semibold text-accent">
          {resent ? "Code resent ✓" : "Resend code"}
        </button>
      </div>
    </main>
  );
}
