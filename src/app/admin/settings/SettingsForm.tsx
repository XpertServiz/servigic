"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { THEME_PRESETS, type ThemeName } from "@/lib/theme";

export function SettingsForm({
  initial,
}: {
  initial: { activeTheme: string; defaultCommissionPct: number; whatsappSupportNumber: string };
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
