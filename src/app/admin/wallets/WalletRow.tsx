import Link from "next/link";
import type { ProWallet, ProviderProfile } from "@prisma/client";

type WalletWithProvider = ProWallet & {
  provider: ProviderProfile & { user: { name: string; phone: string } };
};

const STATUS_TONE: Record<string, string> = {
  NORMAL: "text-secondary border-secondary/30 bg-secondary/10",
  WARNED: "text-accent border-accent/30 bg-accent/10",
  THROTTLED: "text-accent border-accent/30 bg-accent/10",
  SUSPENDED: "text-danger border-danger/30 bg-danger/10",
};

export function WalletRow({ wallet }: { wallet: WalletWithProvider }) {
  const debtPKR = Math.max(0, -wallet.balancePKR);
  const pct = wallet.ceilingPKR > 0 ? Math.min(100, Math.round((debtPKR / wallet.ceilingPKR) * 100)) : 0;

  return (
    <Link
      href={`/admin/wallets/${wallet.id}`}
      className="flex items-center justify-between rounded-[12px] border border-border-subtle bg-bg-elevated p-5 hover:border-accent/50"
    >
      <div>
        <div className="font-bold">{wallet.provider.displayName || wallet.provider.user.name}</div>
        <div className="text-sm text-text-muted">
          {wallet.provider.user.phone} · ceiling PKR {wallet.ceilingPKR.toLocaleString()} · {wallet.unsettledJobCount} unsettled job
          {wallet.unsettledJobCount === 1 ? "" : "s"}
        </div>
        <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-border-subtle">
          <div
            className={`h-full ${pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-accent" : "bg-secondary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className={`font-display text-lg font-bold ${wallet.balancePKR < 0 ? "text-danger" : "text-secondary"}`}>
          PKR {wallet.balancePKR.toLocaleString()}
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_TONE[wallet.provider.dispatchStatus] ?? ""}`}>
          {wallet.provider.dispatchStatus}
        </span>
      </div>
    </Link>
  );
}
