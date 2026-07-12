import { prisma } from "@/lib/prisma";

// Real DB events only — hidden entirely below thresholds (Master Brief §7A, §12: no fake stats).
const MIN_EVENTS_TO_SHOW = 5;

async function getTickerItems(): Promise<string[]> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [recentBids, completedJobs, payoutSum] = await Promise.all([
    prisma.bid.findMany({
      where: { status: "ACCEPTED", createdAt: { gte: weekAgo } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { job: { include: { category: true } } },
    }),
    prisma.booking.count({ where: { status: "COMPLETED", updatedAt: { gte: weekAgo } } }),
    prisma.payout.aggregate({ where: { status: { in: ["SENT", "CONFIRMED"] }, sentAt: { gte: weekAgo } }, _sum: { amountPKR: true } }),
  ]);

  const items: string[] = [];
  for (const bid of recentBids) {
    items.push(`${bid.job.category.name} bid PKR ${bid.pricePKR.toLocaleString()} in ${bid.job.areaLabel}`);
  }
  if (completedJobs > 0) items.push(`${completedJobs} jobs completed this week`);
  if (payoutSum._sum.amountPKR) items.push(`PKR ${payoutSum._sum.amountPKR.toLocaleString()} paid out to pros this week`);

  return items;
}

export async function ProofTicker() {
  const items = await getTickerItems();
  if (items.length < MIN_EVENTS_TO_SHOW) return null;

  const track = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-border-subtle bg-bg-elevated py-4">
      <div className="animate-marquee flex w-max gap-12 whitespace-nowrap">
        {track.map((item, i) => (
          <span key={i} className="text-sm text-text-muted">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
