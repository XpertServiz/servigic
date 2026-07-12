import { prisma } from "@/lib/prisma";
import { PayoutRow } from "./PayoutRow";

export default async function AdminPayoutsPage() {
  const payouts = await prisma.payout.findMany({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    include: { provider: { include: { user: { select: { name: true, phone: true } } } }, booking: { include: { job: true } } },
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-bold">Payouts</h1>
          <p className="text-text-muted">Queue, mark sent, or export a batch CSV for bank transfer.</p>
        </div>
        <a
          href="/api/admin/payouts/export"
          className="rounded-[10px] border border-border-subtle px-4 py-2.5 text-sm font-semibold hover:border-accent hover:text-accent"
        >
          Export CSV →
        </a>
      </div>

      <div className="flex flex-col gap-3">
        {payouts.map((p) => (
          <PayoutRow key={p.id} payout={p} />
        ))}
        {payouts.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No payouts queued.
          </div>
        )}
      </div>
    </div>
  );
}
