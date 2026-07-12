"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProviderProfile } from "@prisma/client";
import { TRADE_LABELS } from "@/lib/trades";

type ProviderWithUser = ProviderProfile & {
  user: { name: string; phone: string; city: string | null; createdAt: Date };
};

export function ProviderRow({ provider }: { provider: ProviderWithUser }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function setLevel(level: number) {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationLevel: level }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Set to Level ${level}`);
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setPending(false);
    }
  }

  async function suspend() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}/suspend`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Suspended");
      router.refresh();
    } catch {
      toast.error("Failed to suspend");
    } finally {
      setPending(false);
    }
  }

  return (
    <tr className="border-t border-border-subtle">
      <td className="p-4">
        <div className="font-semibold">{provider.displayName || provider.user.name}</div>
        <div className="text-xs text-text-muted">Pro #{provider.serialNumber}</div>
      </td>
      <td className="p-4 text-text-muted">
        {provider.user.phone}
        <br />
        {provider.user.city}
      </td>
      <td className="p-4 text-text-muted">
        {provider.trades.map((t) => TRADE_LABELS[t]?.icon ?? "").join(" ") || "—"}
      </td>
      <td className="p-4">
        <div className="flex gap-1 text-xs">
          <span className={provider.cnicUrl ? "text-secondary" : "text-text-dim"}>CNIC</span>
          <span className={provider.selfieUrl ? "text-secondary" : "text-text-dim"}>Selfie</span>
          <span className={provider.policeCertUrl ? "text-secondary" : "text-text-dim"}>Police</span>
        </div>
      </td>
      <td className="p-4">
        <span className="rounded-full border border-border-subtle px-2.5 py-1 text-xs font-bold">
          L{provider.verificationLevel}
        </span>
      </td>
      <td className="p-4 text-text-muted">
        {provider.ratingCount > 0 ? `${provider.ratingAvg.toFixed(1)}★ (${provider.jobsCompleted})` : "—"}
      </td>
      <td className="p-4">
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3].map((lvl) => (
            <button
              key={lvl}
              disabled={pending}
              onClick={() => setLevel(lvl)}
              className="rounded-[6px] border border-border-subtle px-2 py-1 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-50"
            >
              L{lvl}
            </button>
          ))}
          <button
            disabled={pending}
            onClick={suspend}
            className="rounded-[6px] border border-danger/40 px-2 py-1 text-xs font-semibold text-danger disabled:opacity-50"
          >
            Suspend
          </button>
        </div>
      </td>
    </tr>
  );
}
