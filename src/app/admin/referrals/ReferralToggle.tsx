"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ReferralToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  async function flip() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ referralsEnabled: !on }) });
      if (!res.ok) throw new Error();
      setOn(!on);
      toast.success(!on ? "Referrals are ON" : "Referrals are OFF");
      router.refresh();
    } catch {
      toast.error("Could not change the setting");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button onClick={flip} disabled={busy} className={`mb-6 inline-flex items-center gap-3 rounded-full border px-5 py-2.5 text-sm font-bold disabled:opacity-60 ${on ? "border-secondary/40 bg-secondary/10 text-secondary" : "border-border-subtle bg-bg-elevated text-text-muted"}`}>
      <span className={`inline-block h-5 w-9 rounded-full p-0.5 transition ${on ? "bg-secondary" : "bg-border-subtle"}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${on ? "translate-x-4" : ""}`} />
      </span>
      Referral programme: {on ? "ON" : "OFF"} (tap to switch)
    </button>
  );
}
