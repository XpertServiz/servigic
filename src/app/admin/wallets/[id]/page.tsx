import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CeilingForm } from "./CeilingForm";

export default async function AdminWalletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wallet = await prisma.proWallet.findUnique({
    where: { id },
    include: {
      provider: { include: { user: { select: { name: true, phone: true } } } },
      ledgerEntries: { orderBy: { createdAt: "desc" }, include: { booking: { include: { job: { select: { title: true } } } } } },
      topUps: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!wallet) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 font-display text-3xl font-bold">{wallet.provider.displayName || wallet.provider.user.name}</h1>
      <p className="mb-8 text-text-muted">{wallet.provider.user.phone}</p>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
          <div className="text-xs uppercase text-text-muted">Balance</div>
          <div className={`font-display text-xl font-bold ${wallet.balancePKR < 0 ? "text-danger" : "text-secondary"}`}>
            PKR {wallet.balancePKR.toLocaleString()}
          </div>
        </div>
        <div className="rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
          <div className="text-xs uppercase text-text-muted">Dispatch status</div>
          <div className="font-display text-xl font-bold">{wallet.provider.dispatchStatus}</div>
        </div>
        <div className="rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
          <div className="text-xs uppercase text-text-muted">Unsettled jobs</div>
          <div className="font-display text-xl font-bold">{wallet.unsettledJobCount}</div>
        </div>
      </div>

      <CeilingForm walletId={wallet.id} currentCeilingPKR={wallet.ceilingPKR} />

      <h2 className="mb-3 mt-8 font-display text-lg font-bold uppercase">Ledger</h2>
      <div className="flex flex-col gap-2">
        {wallet.ledgerEntries.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-bg-elevated p-3 text-sm">
            <div>
              <div className="font-semibold">{l.memo ?? l.type}</div>
              {l.booking && <div className="text-xs text-text-muted">{l.booking.job.title}</div>}
              <div className="text-xs text-text-muted">{l.createdAt.toLocaleString()}</div>
            </div>
            <div className={`font-bold ${l.type === "COMMISSION_DEBIT" ? "text-danger" : "text-secondary"}`}>
              {l.type === "COMMISSION_DEBIT" ? "-" : "+"}PKR {l.amountPKR.toLocaleString()}
            </div>
          </div>
        ))}
        {wallet.ledgerEntries.length === 0 && <p className="text-sm text-text-muted">No ledger entries yet.</p>}
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-bold uppercase">Top-ups</h2>
      <div className="flex flex-col gap-2">
        {wallet.topUps.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-bg-elevated p-3 text-sm">
            <div>
              <div className="font-semibold">{t.method}</div>
              <div className="text-xs text-text-muted">{t.createdAt.toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold">PKR {t.amountPKR.toLocaleString()}</span>
              <span className="text-xs font-semibold text-text-muted">{t.status}</span>
            </div>
          </div>
        ))}
        {wallet.topUps.length === 0 && <p className="text-sm text-text-muted">No top-ups yet.</p>}
      </div>
    </div>
  );
}
