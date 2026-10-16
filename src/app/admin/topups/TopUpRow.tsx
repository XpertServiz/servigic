"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TopUp, ProWallet, ProviderProfile } from "@prisma/client";
import { PhotoGallery } from "@/components/ui/PhotoGallery";

type TopUpWithWallet = TopUp & {
  wallet: ProWallet & { provider: ProviderProfile & { user: { name: string; phone: string } } };
};

export function TopUpRow({ topUp }: { topUp: TopUpWithWallet }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function act(action: "verify" | "reject") {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/topups/${topUp.id}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(action === "verify" ? "Top-up verified — wallet credited" : "Top-up rejected");
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-bold">{topUp.wallet.provider.displayName || topUp.wallet.provider.user.name}</div>
          <div className="text-sm text-text-muted">
            {topUp.wallet.provider.user.phone} · {topUp.method}
          </div>
          <div className="mt-1 text-sm">
            Transaction ID: <b className="select-all font-mono">{topUp.reference ?? "- (older top-up, none given)"}</b>
          </div>
        </div>
        <div className="font-display text-xl font-bold text-accent">PKR {topUp.amountPKR.toLocaleString()}</div>
      </div>
      {topUp.proofImageUrl ? (
        <div className="mb-3">
          <PhotoGallery urls={[topUp.proofImageUrl]} label="Top-up proof" thumbClassName="h-28 w-28" />
        </div>
      ) : (
        <p className="mb-3 rounded-[8px] border border-danger/30 bg-danger/10 p-2 text-xs font-semibold text-danger">No payment proof was attached. Do not verify unless you can see the payment in your account.</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => act("verify")}
          disabled={pending}
          className="rounded-[8px] bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground disabled:opacity-60"
        >
          Verify
        </button>
        <button
          onClick={() => act("reject")}
          disabled={pending}
          className="rounded-[8px] border border-danger/40 px-4 py-2 text-sm font-semibold text-danger disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
