"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProviderProfile } from "@prisma/client";
import { TRADE_LABELS } from "@/lib/trades";
import { ImageLightbox, type LightboxImage } from "@/components/ui/ImageLightbox";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { ProviderAvatar } from "@/components/ui/ProviderAvatar";

type ProviderWithUser = ProviderProfile & {
  user: { name: string; phone: string; city: string | null; createdAt: Date };
};

export function ProviderRow({ provider }: { provider: ProviderWithUser }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const docs: LightboxImage[] = [
    provider.cnicUrl ? { url: provider.cnicUrl, label: "CNIC" } : null,
    provider.selfieUrl ? { url: provider.selfieUrl, label: "Selfie" } : null,
    provider.policeCertUrl ? { url: provider.policeCertUrl, label: "Police Certificate" } : null,
  ].filter((d): d is LightboxImage => d !== null);

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

  function openDoc(label: string) {
    const index = docs.findIndex((d) => d.label === label);
    if (index >= 0) setLightboxIndex(index);
  }

  return (
    <tr className="border-t border-border-subtle">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <ProviderAvatar
            photoUrl={provider.selfieUrl}
            photoQualityOk={provider.photoQualityOk}
            verificationLevel={provider.verificationLevel}
            fallbackIcon={TRADE_LABELS[provider.trades[0]]?.icon ?? "👤"}
            size="sm"
          />
          <div>
            <div className="font-semibold">{provider.displayName || provider.user.name}</div>
            <div className="text-xs text-text-muted">Pro #{provider.serialNumber}</div>
          </div>
        </div>
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
        <div className="flex gap-2 text-xs">
          <DocLink label="CNIC" available={Boolean(provider.cnicUrl)} onClick={() => openDoc("CNIC")} />
          <DocLink label="Selfie" available={Boolean(provider.selfieUrl)} onClick={() => openDoc("Selfie")} />
          <DocLink label="Police" available={Boolean(provider.policeCertUrl)} onClick={() => openDoc("Police Certificate")} />
        </div>
      </td>
      <td className="p-4">
        <VerificationBadge level={provider.verificationLevel} />
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

      <ImageLightbox images={docs} openIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />
    </tr>
  );
}

function DocLink({ label, available, onClick }: { label: string; available: boolean; onClick: () => void }) {
  if (!available) {
    return <span className="text-text-dim">{label}</span>;
  }
  return (
    <button onClick={onClick} className="font-semibold text-secondary underline-offset-2 hover:underline">
      {label}
    </button>
  );
}
