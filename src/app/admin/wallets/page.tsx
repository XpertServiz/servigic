import { prisma } from "@/lib/prisma";
import { WalletRow } from "./WalletRow";

export default async function AdminWalletsPage() {
  const wallets = await prisma.proWallet.findMany({
    orderBy: { balancePKR: "asc" },
    include: { provider: { include: { user: { select: { name: true, phone: true } } } } },
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-bold">Pro Wallets</h1>
          <p className="text-text-muted">Commission owed by each pro under the cash-after-job payment model.</p>
        </div>
        {/* A file download from an API route, not a page: next/link would try client-side navigation. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/admin/wallets/export"
          className="rounded-[10px] border border-border-subtle px-4 py-2.5 text-sm font-semibold hover:border-accent hover:text-accent"
        >
          Export CSV →
        </a>
      </div>

      <div className="flex flex-col gap-3">
        {wallets.map((w) => (
          <WalletRow key={w.id} wallet={w} />
        ))}
        {wallets.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No wallets yet — a wallet is created the first time a pro completes a cash-wallet-mode job.
          </div>
        )}
      </div>
    </div>
  );
}
