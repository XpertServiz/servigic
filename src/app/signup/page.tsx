"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { LIVE_CITIES as CITIES } from "@/lib/markets";

export default function SignupPage() {
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
        setError(data.error || "Something went wrong");
        return;
      }
      router.push(`/verify-otp?userId=${data.userId}`);
    } catch {
      setError("Network error — please try again");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-[440px]">
        <Link href="/" className="mb-8 flex items-center gap-2.5 font-display text-xl font-bold">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-[#ff8a20] font-extrabold text-accent-foreground">
            S
          </span>
          Servigic
        </Link>
        <h1 className="mb-2 font-display text-3xl font-bold">Create your account</h1>
        <p className="mb-6 text-text-muted">Post jobs or start bidding — pick how you&apos;ll use Servigic.</p>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("CUSTOMER")}
            className={clsx(
              "rounded-[10px] border px-4 py-3 text-left transition-colors",
              role === "CUSTOMER" ? "border-accent bg-accent/10" : "border-border-subtle bg-bg-elevated"
            )}
          >
            <div className="font-bold">I need a service</div>
            <div className="text-xs text-text-muted">Post jobs, get bids</div>
          </button>
          <button
            type="button"
            onClick={() => setRole("PROVIDER")}
            className={clsx(
              "rounded-[10px] border px-4 py-3 text-left transition-colors",
              role === "PROVIDER" ? "border-accent bg-accent/10" : "border-border-subtle bg-bg-elevated"
            )}
          >
            <div className="font-bold">I&apos;m a pro</div>
            <div className="text-xs text-text-muted">Bid, earn, get paid</div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-muted">Full name</label>
            <input
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 text-text outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-muted">Phone number</label>
            <input
              required
              autoComplete="tel"
              placeholder="03001234567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 text-text outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-muted">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 text-text outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-muted">City</label>
            <select
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 text-text outline-none focus:border-accent"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-muted">Password</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 text-text outline-none focus:border-accent"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-[10px] bg-accent px-6 py-3.5 font-bold text-accent-foreground disabled:opacity-60"
          >
            {pending ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-8 text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-accent">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
