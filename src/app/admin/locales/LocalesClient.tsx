"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface LocaleConfigView {
  countryCode: string;
  countryName: string;
  language: string;
  direction: string;
  currency: string;
  paymentMethodsShown: string[];
  legalDisclaimer: string;
  isLive: boolean;
  citiesLive: string[];
}

const LANGUAGES = ["en", "ur", "ar", "de", "fr", "pl"] as const;
const CURRENCIES = ["PKR", "USD", "CAD", "EUR", "PLN", "SAR", "AED", "QAR"] as const;

export function LocalesClient({ configs }: { configs: LocaleConfigView[] }) {
  return (
    <div className="flex flex-col gap-4">
      {configs.map((c) => (
        <LocaleRow key={c.countryCode} initial={c} />
      ))}
    </div>
  );
}

function LocaleRow({ initial }: { initial: LocaleConfigView }) {
  const router = useRouter();
  const [form, setForm] = useState({
    language: initial.language,
    direction: initial.direction,
    currency: initial.currency,
    paymentMethodsShown: initial.paymentMethodsShown.join(", "),
    legalDisclaimer: initial.legalDisclaimer,
    isLive: initial.isLive,
    citiesLive: initial.citiesLive.join(", "),
  });
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/locales/${initial.countryCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          paymentMethodsShown: form.paymentMethodsShown.split(",").map((s) => s.trim()).filter(Boolean),
          citiesLive: form.citiesLive.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success(`${initial.countryName} saved`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">
          {initial.countryName} <span className="text-text-muted">({initial.countryCode})</span>
        </h3>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.isLive}
            onChange={(e) => setForm({ ...form, isLive: e.target.checked })}
            className="accent-secondary"
          />
          <span className={form.isLive ? "text-secondary" : "text-text-muted"}>{form.isLive ? "Live" : "Coming Soon"}</span>
        </label>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-muted">Language</label>
          <select
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value })}
            className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-muted">Direction</label>
          <select
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
            className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          >
            <option value="ltr">LTR</option>
            <option value="rtl">RTL</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-muted">Currency</label>
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-muted">Payment methods (comma-separated)</label>
          <input
            value={form.paymentMethodsShown}
            onChange={(e) => setForm({ ...form, paymentMethodsShown: e.target.value })}
            className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold text-text-muted">Live cities (comma-separated)</label>
        <input
          value={form.citiesLive}
          onChange={(e) => setForm({ ...form, citiesLive: e.target.value })}
          className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold text-text-muted">Legal disclaimer</label>
        <textarea
          value={form.legalDisclaimer}
          onChange={(e) => setForm({ ...form, legalDisclaimer: e.target.value })}
          rows={3}
          className="w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
        />
      </div>

      <button
        onClick={save}
        disabled={pending}
        className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
