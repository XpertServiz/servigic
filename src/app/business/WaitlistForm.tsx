"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

const inputCls = "rounded-xl border border-border-subtle bg-bg-elevated-2 px-4 py-3 text-sm text-text outline-none transition-colors focus:border-accent";

export function WaitlistForm() {
  const t = useTranslations("businessPage.form");
  const [form, setForm] = useState({ companyName: "", contactName: "", phone: "", email: "", unitCount: "", city: "" });
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/business/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, unitCount: form.unitCount ? Number(form.unitCount) : undefined }),
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

  if (submitted) {
    return <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-6 text-center text-secondary">{t("done")}</div>;
  }

  return (
    <form onSubmit={submit} className="sv-card flex flex-col gap-4 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input required placeholder={t("company")} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className={inputCls} />
        <input required placeholder={t("contact")} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className={inputCls} />
        <input required placeholder={t("phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} dir="ltr" />
        <input type="email" placeholder={t("email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} dir="ltr" />
        <input type="number" placeholder={t("units")} value={form.unitCount} onChange={(e) => setForm({ ...form, unitCount: e.target.value })} className={inputCls} />
        <input placeholder={t("city")} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
      </div>
      <button type="submit" disabled={pending} className="sv-shine rounded-full bg-gradient-to-b from-[#ffc24a] to-accent px-6 py-3.5 font-semibold text-accent-foreground disabled:opacity-60">
        {pending ? t("joining") : t("join")}
      </button>
    </form>
  );
}
