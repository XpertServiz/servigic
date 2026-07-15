"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { THEME_PRESETS, type ThemeName } from "@/lib/theme";
import type { FeatureFlags } from "@/lib/featureFlags";

const FLAG_LABELS: Record<keyof FeatureFlags, { label: string; desc: string }> = {
  aiJobTriage: { label: "Job Triage Agent", desc: "\"Suggest category, urgency & budget\" on the job post form" },
  aiLeadQualifier: { label: "Lead Qualifier Agent", desc: "\"AI Qualify\" priority score + drafted outreach in Leads CRM" },
  aiDisputeSummarizer: { label: "Dispute Summarizer Agent", desc: "\"Summarize with AI\" on the admin disputes queue" },
  aiBidWinHint: { label: "Bid-Win Probability (ML)", desc: "\"Price to win\" hint shown to providers on the bid form" },
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
        <label className="mb-2 block text-sm font-semibold text-text-muted">AI Agents (P8/P9)</label>
        <p className="mb-3 text-xs text-text-dim text-text-muted">
          Off here hides the feature in the UI regardless of AI_SERVICE_URL. Also fully off whenever AI_SERVICE_URL
          isn&apos;t configured — these flags are for staged rollout once it is.
        </p>
        <div className="flex flex-col gap-2">
          {(Object.keys(FLAG_LABELS) as (keyof FeatureFlags)[]).map((key) => (
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
