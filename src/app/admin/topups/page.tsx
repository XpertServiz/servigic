import { prisma } from "@/lib/prisma";
import { TopUpRow } from "./TopUpRow";
import { VerifyAllButton } from "./VerifyAllButton";

export default async function AdminTopUpsPage() {
  const topUps = await prisma.topUp.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { createdAt: "asc" },
    include: { wallet: { include: { provider: { include: { user: { select: { name: true, phone: true } } } } } } },
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-bold">Top-ups</h1>
          <p className="text-text-muted">Verify pro wallet top-up proofs — clears their commission debt.</p>
        </div>
        <VerifyAllButton topUpIds={topUps.map((t) => t.id)} />
      </div>

      <div className="flex flex-col gap-3">
        {topUps.map((t) => (
          <TopUpRow key={t.id} topUp={t} />
        ))}
        {topUps.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No top-ups awaiting verification.
          </div>
        )}
      </div>
    </div>
  );
}
