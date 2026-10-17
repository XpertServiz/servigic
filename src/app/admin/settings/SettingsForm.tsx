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
    referralNewProFreeJobs: number;
    referralNewCustomerDiscountPKR: number;
    referralNewCustomerMinJobPKR: number;
    proRadiusMinKm: number;
    proRadiusMaxKm: number;
    proRadiusDefaultKm: number;
    maxTradesPerPro: number;
    payJazzcashNumber: string;
    payJazzcashTitle: string;
    payEasypaisaNumber: string;
    payEasypaisaTitle: string;
    payBankName: string;
    payBankAccountTitle: string;
    payBankAccountNumber: string;
    announcementActive: boolean;
    announcementTitle: string;
    announcementBody: string;
    announcementAudience: "ALL" | "CUSTOMER" | "PROVIDER";
    minAndroidVersionCode: number;
    storeUrlPro: string;
    storeUrlCustomer: string;
    minTopUpPKR: number;
    proAppLive: boolean;
    customerAppLive: boolean;
    proTesterGroupUrl: string;
    proTestingOptInUrl: string;
    customerPreregUrl: string;
    signupNotifyEmail: string;
    foundingProSlots: number;
    foundingProPct: number;
    foundingProMonths: number;
    foundingProCity: string;
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
        <label className="mb-2 block text-sm font-semibold text-text-muted">Announcement banner in the apps</label>
        <p className="mb-3 text-xs text-text-muted">A message shown at the top of the home screen (maintenance, new feature, a reminder). Users can dismiss it. Changing it needs no app update.</p>
        <label className="mb-3 flex items-center justify-between gap-3 rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3">
          <span className="text-sm font-semibold">Show the banner</span>
          <input type="checkbox" checked={form.announcementActive} onChange={(e) => setForm({ ...form, announcementActive: e.target.checked })} className="h-5 w-5 accent-accent" />
        </label>
        <div className="grid gap-3">
          <input
            placeholder="Title (short)"
            value={form.announcementTitle}
            onChange={(e) => setForm({ ...form, announcementTitle: e.target.value })}
            className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
          />
          <textarea
            placeholder="Message"
            rows={3}
            value={form.announcementBody}
            onChange={(e) => setForm({ ...form, announcementBody: e.target.value })}
            className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
          />
          <select
            value={form.announcementAudience}
            onChange={(e) => setForm({ ...form, announcementAudience: e.target.value as typeof form.announcementAudience })}
            className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
          >
            <option value="ALL">Show to everyone</option>
            <option value="PROVIDER">Pros only</option>
            <option value="CUSTOMER">Customers only</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">App updates &amp; wallet</label>
        <div className="grid gap-3">
          {(
            [
              ["minAndroidVersionCode", "Oldest Android app version still allowed (version code)", "Apps older than this show a \"please update\" screen. 0 = off. Use it when an old build is broken or unsafe."],
              ["minTopUpPKR", "Smallest wallet top-up (PKR)", "A pro cannot submit a top-up below this amount."],
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
          {(
            [
              ["storeUrlPro", "Servigic Pro update link (Play Store URL)"],
              ["storeUrlCustomer", "Servigic customer update link (Play Store URL)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-text-muted">{label}</label>
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder="https://play.google.com/store/apps/details?id=..."
                className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">Pre-launch &amp; launch switches</label>
        <p className="mb-3 text-xs text-text-muted">
          Until an app is switched live, the website shows &quot;Join the list&quot; instead of a Play Store button. Switch it on only when the app is public on Google Play and its update link above is filled in.
          A link left empty keeps its button hidden on the website.
        </p>
        <div className="grid gap-3">
          {(
            [
              ["proAppLive", "Servigic Pro app is live on Google Play"],
              ["customerAppLive", "Servigic customer app is live on Google Play"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" />
              {label}
            </label>
          ))}
          {(
            [
              ["proTesterGroupUrl", "Pro tester group link (Google Group)"],
              ["proTestingOptInUrl", "Pro testing opt-in link (Play testing)"],
              ["customerPreregUrl", "Customer pre-registration link (Play)"],
              ["signupNotifyEmail", "Email that receives a message on every waitlist signup"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-text-muted">{label}</label>
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">Founding Pro offer</label>
        <p className="mb-3 text-xs text-text-muted">
          The first pros approved in this city pay the reduced commission for a few months, then the standard rate returns automatically. Places used so far are counted from approved pros.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["foundingProSlots", "Places available"],
              ["foundingProPct", "Reduced commission (%)"],
              ["foundingProMonths", "Months it lasts"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-text-muted">{label}</label>
              <input
                type="number"
                min={0}
                step={key === "foundingProPct" ? 0.5 : 1}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
              />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-muted">City</label>
            <input
              value={form.foundingProCity}
              onChange={(e) => setForm({ ...form, foundingProCity: e.target.value })}
              className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">Where pros send wallet top-ups</label>
        <p className="mb-3 text-xs text-text-muted">
          Shown inside the Pro app&apos;s &quot;Top up wallet&quot; sheet, so the pro knows exactly where to send the money. A method is hidden if its number is empty or a placeholder (zeros).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["payJazzcashNumber", "JazzCash number"],
              ["payJazzcashTitle", "JazzCash account name"],
              ["payEasypaisaNumber", "EasyPaisa number"],
              ["payEasypaisaTitle", "EasyPaisa account name"],
              ["payBankName", "Bank name"],
              ["payBankAccountTitle", "Bank account title"],
              ["payBankAccountNumber", "Bank account number / IBAN"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className={key === "payBankAccountNumber" ? "sm:col-span-2" : ""}>
              <label className="mb-1 block text-xs font-semibold text-text-muted">{label}</label>
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full rounded-[10px] border border-border-subtle bg-bg-elevated px-4 py-3 outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text-muted">Pro service radius &amp; trades</label>
        <div className="flex flex-col gap-3">
          {(
            [
              ["proRadiusMinKm", "Smallest radius a pro can set (km)", "The slider's left end."],
              ["proRadiusMaxKm", "Largest radius a pro can set (km)", "The slider's right end. Older, bigger radii are capped to this when matching jobs."],
              ["proRadiusDefaultKm", "Default radius for new pros (km)", "Must sit between the two limits."],
              ["maxTradesPerPro", "Most trades one pro can have", "Each additional trade also needs your approval (Admin > Trade approvals)."],
            ] as const
          ).map(([key, label, desc]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-text-muted">{label}</label>
              <p className="mb-1.5 text-xs text-text-muted">{desc}</p>
              <input
                type="number"
                min={1}
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
              ["referralNewCustomerDiscountPKR", "New customer discount (PKR)", "Off the new customer's first completed job (needs the minimum below). Servigic funds it: the pro's wallet is credited the same amount."],
              ["referralNewCustomerMinJobPKR", "Minimum job value for that discount (PKR)", "The welcome discount only applies to a first job worth at least this much."],
              ["referralCustomerCreditPKR", "Booking credit for a referring customer (PKR)", "Released to the customer who invited, after the invited person's first discounted job is completed. Comes off their next job - never cash."],
              ["referralProBonusPKR", "Commission credit for a referring pro (PKR)", "Reduces what the pro owes Servigic once the pro they invited completes the number of jobs below - never cash."],
              ["referralProJobsRequired", "Jobs a referred pro must complete before the referrer is rewarded", "Same count for a referring pro (commission credit) or a referring customer (booking credit)."],
              ["referralNewProFreeJobs", "Commission-free jobs for a referred pro", "A pro who signs up with a referral code pays 0% commission on their first N jobs."],
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
