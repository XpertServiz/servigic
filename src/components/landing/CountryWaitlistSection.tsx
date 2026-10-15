"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Eyebrow } from "@/components/landing/Eyebrow";

const inputCls = "flex-1 rounded-full border border-border-subtle bg-bg-elevated px-5 py-3 text-sm text-text outline-none transition-colors focus:border-accent";

export function CountryWaitlistSection({ countryCode, countryName }: { countryCode: string; countryName: string }) {
  const t = useTranslations("waitlist");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/locales/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, email, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("failed"));
        return;
      }
      setSubmitted(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="waitlist" className="container-x max-w-[720px] py-16 text-center md:py-20">
      <Eyebrow>{t("eyebrow", { country: countryName })}</Eyebrow>
      <h2 className="mb-4 text-[clamp(26px,4.2vw,42px)] font-bold leading-tight tracking-[-0.018em]">{t("title")}</h2>
      <p className="mb-8 text-text-muted">{t("desc", { country: countryName })}</p>

      {submitted ? (
        <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-6 text-secondary">{t("done", { country: countryName })}</div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <input required type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} dir="ltr" />
          <input placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          <button type="submit" disabled={pending} className="rounded-full bg-accent px-7 py-3 font-semibold text-accent-foreground disabled:opacity-60">
            {pending ? t("joining") : t("join")}
          </button>
        </form>
      )}
    </section>
  );
}
