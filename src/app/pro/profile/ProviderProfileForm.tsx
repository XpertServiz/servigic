"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProviderProfile } from "@prisma/client";
import { TRADE_LABELS } from "@/lib/trades";
import { TRADES } from "@/lib/validation/provider";
import { UploadButton } from "@/lib/uploadthing";

const VERIFICATION_LABELS: Record<number, string> = {
  0: "Unverified — submit documents below",
  1: "Level 1 — Approved, can bid",
  2: "Level 2 — Verified Pro",
  3: "Level 3 — Gold Ustad",
};

export function ProviderProfileForm({ initial }: { initial: ProviderProfile | null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: initial?.displayName ?? "",
    trades: initial?.trades ?? [],
    skillsNote: initial?.skillsNote ?? "",
    serviceRadiusKm: initial?.serviceRadiusKm ?? 10,
    baseLat: initial?.baseLat ?? 24.8607,
    baseLng: initial?.baseLng ?? 67.0011,
    cnicUrl: initial?.cnicUrl ?? "",
    selfieUrl: initial?.selfieUrl ?? "",
    policeCertUrl: initial?.policeCertUrl ?? "",
    payoutMethod: initial?.payoutMethod ?? "EASYPAISA",
    payoutAccount: initial?.payoutAccount ?? "",
    agreementAccepted: Boolean(initial?.agreementAcceptedAt),
  });
  const [pending, setPending] = useState(false);

  function toggleTrade(trade: string) {
    setForm((f) => ({
      ...f,
      trades: f.trades.includes(trade as never) ? f.trades.filter((t) => t !== trade) : [...f.trades, trade as never],
    }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f) => ({ ...f, baseLat: pos.coords.latitude, baseLng: pos.coords.longitude }));
      toast.success("Location captured");
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.agreementAccepted) {
      toast.error("Please accept the provider agreement first");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/provider/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save profile");
        return;
      }
      toast.success("Profile saved");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="rounded-[10px] border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">
        {VERIFICATION_LABELS[initial?.verificationLevel ?? 0]}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text-muted">Display name (shown after payment)</label>
        <input
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">Trades</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TRADES.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => toggleTrade(t)}
              className={`rounded-[8px] border px-3 py-2 text-left text-sm ${
                form.trades.includes(t as never) ? "border-accent bg-accent/10" : "border-border-subtle bg-bg-elevated"
              }`}
            >
              {TRADE_LABELS[t].icon} {TRADE_LABELS[t].name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text-muted">
          Service radius: {form.serviceRadiusKm} km
        </label>
        <input
          type="range"
          min={1}
          max={50}
          value={form.serviceRadiusKm}
          onChange={(e) => setForm({ ...form, serviceRadiusKm: Number(e.target.value) })}
          className="w-full accent-accent"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text-muted">Base location</label>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">
            {form.baseLat.toFixed(4)}, {form.baseLng.toFixed(4)}
          </span>
          <button
            type="button"
            onClick={useMyLocation}
            className="rounded-[8px] border border-border-subtle px-3 py-1.5 text-sm font-semibold hover:border-accent hover:text-accent"
          >
            📍 Use my location
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <DocUploadField
          label="CNIC"
          url={form.cnicUrl}
          endpoint="providerDocs"
          onUploaded={(url) => setForm({ ...form, cnicUrl: url })}
        />
        <DocUploadField
          label="Selfie"
          url={form.selfieUrl}
          endpoint="providerDocs"
          onUploaded={(url) => setForm({ ...form, selfieUrl: url })}
        />
        <DocUploadField
          label="Police cert. (optional)"
          url={form.policeCertUrl}
          endpoint="providerDocs"
          onUploaded={(url) => setForm({ ...form, policeCertUrl: url })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-text-muted">Payout method</label>
          <select
            value={form.payoutMethod}
            onChange={(e) => setForm({ ...form, payoutMethod: e.target.value as typeof form.payoutMethod })}
            className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
          >
            <option value="EASYPAISA">EasyPaisa</option>
            <option value="JAZZCASH">JazzCash</option>
            <option value="BANK">Bank Transfer</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-text-muted">Account number</label>
          <input
            value={form.payoutAccount}
            onChange={(e) => setForm({ ...form, payoutAccount: e.target.value })}
            className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
          />
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={form.agreementAccepted}
          onChange={(e) => setForm({ ...form, agreementAccepted: e.target.checked })}
          className="mt-1 accent-accent"
        />
        I agree that jobs found through Servigic close on Servigic — taking a customer off-platform after a lead is
        grounds for delisting.
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[10px] bg-accent px-6 py-3.5 font-bold text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Profile"}
      </button>
    </form>
  );
}

function DocUploadField({
  label,
  url,
  endpoint,
  onUploaded,
}: {
  label: string;
  url: string;
  endpoint: "providerDocs";
  onUploaded: (url: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-text-muted">{label}</label>
      {url ? (
        <div className="flex h-20 items-center justify-center rounded-[8px] border border-secondary/40 bg-secondary/10 text-xs font-semibold text-secondary">
          Uploaded ✓
        </div>
      ) : (
        <UploadButton
          endpoint={endpoint}
          onClientUploadComplete={(res) => res[0] && onUploaded(res[0].ufsUrl)}
          onUploadError={(e) => {
            toast.error(e.message);
          }}
        />
      )}
    </div>
  );
}
