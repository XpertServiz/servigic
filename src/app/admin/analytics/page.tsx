import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/StatCard";
import { CityHeatChart } from "./CityHeatChart";
import { DemandHeatmap } from "./DemandHeatmap";

export default async function AdminAnalyticsPage() {
  const [completedBookings, totalJobs, jobsWithBids, jobsWithFirstBid, cityCounts] = await Promise.all([
    prisma.booking.findMany({ where: { status: "COMPLETED" }, select: { totalPKR: true, commissionPKR: true } }),
    prisma.job.count(),
    prisma.job.count({ where: { bids: { some: {} } } }),
    prisma.job.findMany({
      where: { bids: { some: {} } },
      select: { createdAt: true, bids: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } } },
      take: 500,
    }),
    prisma.job.groupBy({ by: ["city"], _count: { _all: true } }),
  ]);

  const gmv = completedBookings.reduce((s, b) => s + b.totalPKR, 0);
  const commission = completedBookings.reduce((s, b) => s + b.commissionPKR, 0);
  const takeRate = gmv > 0 ? ((commission / gmv) * 100).toFixed(1) : "0";
  const fillRate = totalJobs > 0 ? Math.round((jobsWithBids / totalJobs) * 100) : 0;

  const firstBidMinutes = jobsWithFirstBid
    .filter((j) => j.bids[0])
    .map((j) => (j.bids[0].createdAt.getTime() - j.createdAt.getTime()) / 60000);
  const avgTimeToFirstBid =
    firstBidMinutes.length > 0 ? Math.round(firstBidMinutes.reduce((s, m) => s + m, 0) / firstBidMinutes.length) : null;

  const cityHeat = cityCounts.map((c) => ({ city: c.city, jobs: c._count._all }));

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Analytics</h1>
      <p className="mb-8 text-text-muted">Platform performance at a glance.</p>

      <div className="mb-8 grid grid-cols-2 gap-5 md:grid-cols-4">
        <StatCard label="GMV (completed)" value={`PKR ${gmv.toLocaleString()}`} />
        <StatCard label="Take rate" value={`${takeRate}%`} />
        <StatCard label="Fill rate (≥1 bid)" value={`${fillRate}%`} />
        <StatCard label="Avg time-to-first-bid" value={avgTimeToFirstBid !== null ? `${avgTimeToFirstBid} min` : "—"} />
      </div>

      <div className="mb-8 rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
        <h2 className="mb-4 font-bold">City heat</h2>
        <CityHeatChart data={cityHeat} />
      </div>

      <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
        <h2 className="mb-1 font-bold">Demand Forecast (ML)</h2>
        <p className="mb-4 text-xs text-text-muted">Top zone/hour slots by forecasted job volume — PyTorch ridge regression on trailing 30 days.</p>
        <DemandHeatmap />
      </div>
    </div>
  );
}
