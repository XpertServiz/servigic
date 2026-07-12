import { prisma } from "@/lib/prisma";
import { getFeatureFlags } from "@/lib/featureFlags";
import { DisputeRow } from "./DisputeRow";

export default async function AdminDisputesPage() {
  const [disputes, flags] = await Promise.all([
    prisma.dispute.findMany({
      where: { resolution: null },
      orderBy: { createdAt: "asc" },
      include: {
        booking: { include: { job: true, customer: { select: { name: true } }, providerUser: { select: { name: true } } } },
        openedBy: { select: { name: true, role: true } },
      },
    }),
    getFeatureFlags(),
  ]);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Disputes</h1>
      <p className="mb-8 text-text-muted">Review photos from both sides and release, partial-refund, or full-refund.</p>

      <div className="flex flex-col gap-4">
        {disputes.map((d) => (
          <DisputeRow key={d.id} dispute={d} aiSummarizerEnabled={flags.aiDisputeSummarizer} />
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
