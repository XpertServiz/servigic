import { prisma } from "@/lib/prisma";
import { DisputeRow } from "./DisputeRow";

export default async function AdminDisputesPage() {
  const disputes = await prisma.dispute.findMany({
    where: { resolution: null },
    orderBy: { createdAt: "asc" },
    include: {
      booking: { include: { job: true, customer: { select: { name: true } }, providerUser: { select: { name: true } } } },
      openedBy: { select: { name: true, role: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Disputes</h1>
      <p className="mb-8 text-text-muted">Review photos from both sides and release, partial-refund, or full-refund.</p>

      <div className="flex flex-col gap-4">
        {disputes.map((d) => (
          <DisputeRow key={d.id} dispute={d} />
        ))}
        {disputes.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No open disputes.
          </div>
        )}
      </div>
    </div>
  );
}
