"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { THEME_PRESETS, type ThemeName } from "@/lib/theme";
import type { FeatureFlags } from "@/lib/featureFlags";

const FLAG_LABELS: Record<Exclude<keyof FeatureFlags, "paymentMode">, { label: string; desc: string }> = {
  aiJobTriage: { label: "Job Triage Agent", desc: "\"Suggest category, urgency & budget\" on the job post form" },
  aiLeadQualifier: { label: "Lead Qualifier Agent", desc: "\"AI Qualify\" priority score + drafted outreach in Leads CRM" },
  aiDisputeSummarizer: { label: "Dispute Summarizer Agent", desc: "\"Summarize with AI\" on the admin disputes queue" },
  aiBidWinHint: { label: "Bid-Win Probability (ML)", desc: "\"Price to win\" hint shown to providers on the bid form" },
  smsFallbackEnabled: { label: "SMS/WhatsApp job-alert fallback (stub)", desc: "Phase 2: text pros who ignored the push. Costs money per message and is not implemented yet — leave off." },
};

export function SettingsForm({
  initial,
}: {
  initial: {
    activeTheme: string;
    defaultCommissionPct: number;
    whatsappSupportNumber: string;
    demoVideoCustomerUrl: string;
    demoVideoProUrl: string;
    defaultWalletCeilingPKR: number;
    earlyProFreeJobs: number;
    alertNearestN: number;
    noBidsAfterMin: number;
    referralsEnabled: boolean;
    referralCustomerCreditPKR: number;
    referralProBonusPKR: number;
    referralProJobsRequired: number;
    featureFlags: FeatureFlags;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">Theme</label>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(THEME_PRESETS) as ThemeName[]).map((key) => {
            const preset = THEME_PRESETS[key];
            return (
              <button
                key={key}
                onClick={() => setForm({ ...form, activeTheme: key })}
                className={`flex items-center gap-3 rounded-[10px] border px-4 py-3 text-left ${
                  form.activeTheme === key ? "border-accent bg-accent/10" : "border-border-subtle bg-bg-elevated"
                }`}
              >
                <span className="h-5 w-5 rounded-full" style={{ backgroundColor: preset.accent }} />
                <div>
                  <div className="text-sm font-bold">{preset.label}</div>
                  <div className="text-xs text-text-muted">{preset.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text-muted">Default commission (%)</label>
        <input
          type="number"
          value={form.defaultCommissionPct}
          onChange={(e) => setForm({ ...form, defaultCommissionPct: Number(e.target.value) })}
          className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text-muted">WhatsApp support number</label>
        <input
          value={form.whatsappSupportNumber}
          onChange={(e) => setForm({ ...form, whatsappSupportNumber: e.target.value })}
          placeholder="+923001234567"
          className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">Landing page demo videos</label>
        <p className="mb-3 text-xs text-text-muted">
          Paste a YouTube URL or bare video ID. Leave blank to hide that video slot on the landing page.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs text-text-muted">&quot;How a customer posts a job&quot; video</label>
            <input
              value={form.demoVideoCustomerUrl}
              onChange={(e) => setForm({ ...form, demoVideoCustomerUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">&quot;How a pro accepts a bid&quot; video</label>
            <input
              value={form.demoVideoProUrl}
              onChange={(e) => setForm({ ...form, demoVideoProUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">Payment Mode</label>
        <p className="mb-3 text-xs text-text-muted">
          CASH_WALLET: customers pay pros directly after the job; Servigic collects its 12% commission via the
          pro&apos;s Commission Wallet. PROTECTED: legacy upfront-escrow flow (Payment/Payout), kept for future
          international markets.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["CASH_WALLET", "PROTECTED"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setForm({ ...form, featureFlags: { ...form.featureFlags, paymentMode: mode } })}
              className={`rounded-[10px] border px-4 py-3 text-left text-sm font-bold ${
                form.featureFlags.paymentMode === mode ? "border-accent bg-accent/10" : "border-border-subtle bg-bg-elevated"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text-muted">Default wallet debt ceiling (PKR)</label>
        <p className="mb-2 text-xs text-text-muted">
          New pros&apos; Commission Wallet dispatch-block threshold (CASH_WALLET mode only) — editable per pro afterward.
        </p>
        <input
          type="number"
          value={form.defaultWalletCeilingPKR}
          onChange={(e) => setForm({ ...form, defaultWalletCeilingPKR: Number(e.target.value) })}
          className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">Launch, alerts &amp; early pros</label>
        <div className="flex flex-col gap-3">
          {(
            [
              ["earlyProFreeJobs", "Commission-free jobs for early pros (N)", "A pro activated while their market is in PILOT gets a Founding Pro badge and their first N jobs without commission. 0 = off."],
              ["alertNearestN", "Job alerts: nearest N pros", "Each new job is pushed to the nearest N matching pros (online or offline)."],
              ["noBidsAfterMin", "Tell the customer there are no bids after (minutes)", "One reminder with the option to widen the search or edit the job."],
            ] as const
          ).map(([key, label, desc]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-text-muted">{label}</label>
              <p className="mb-1.5 text-xs text-text-muted">{desc}</p>
              <input
                type="number"
                min={0}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">Referrals</label>
        <label className="mb-3 flex items-center justify-between gap-3 rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Referral programme on</div>
            <div className="text-xs text-text-muted">Every customer and pro always has a code to share; rewards are only created while this is on.</div>
          </div>
          <input
            type="checkbox"
            checked={form.referralsEnabled}
            onChange={(e) => setForm({ ...form, referralsEnabled: e.target.checked })}
            className="h-5 w-5 flex-none accent-accent"
          />
        </label>
        <div className="flex flex-col gap-3">
          {(
            [
              ["referralCustomerCreditPKR", "Customer referral credit (PKR, each)", "Both the customer who invited and the new customer get this credit, released after the new customer's first job is completed and paid. It comes off their next job."],
              ["referralProBonusPKR", "Pro referral bonus (PKR)", "Paid into the referring pro's wallet once the new pro has completed the number of jobs below."],
              ["referralProJobsRequired", "Jobs the new pro must complete (N)", "The referral bonus is released after this many completed jobs."],
            ] as const
          ).map(([key, label, desc]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-text-muted">{label}</label>
              <p className="mb-1.5 text-xs text-text-muted">{desc}</p>
              <input
                type="number"
                min={0}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">AI Agents (P8/P9)</label>
        <p className="mb-3 text-xs text-text-dim text-text-muted">
          Off here hides the feature in the UI regardless of AI_SERVICE_URL. Also fully off whenever AI_SERVICE_URL
          isn&apos;t configured — these flags are for staged rollout once it is.
        </p>
        <div className="flex flex-col gap-2">
          {(Object.keys(FLAG_LABELS) as Exclude<keyof FeatureFlags, "paymentMode">[]).map((key) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3"
            >
              <div>
                <div className="text-sm font-semibold">{FLAG_LABELS[key].label}</div>
                <div className="text-xs text-text-muted">{FLAG_LABELS[key].desc}</div>
              </div>
              <input
                type="checkbox"
                checked={form.featureFlags[key]}
                onChange={(e) => setForm({ ...form, featureFlags: { ...form.featureFlags, [key]: e.target.checked } })}
                className="h-5 w-5 flex-none accent-accent"
              />
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={pending}
        className="rounded-[10px] bg-accent px-6 py-3 font-bold text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}
