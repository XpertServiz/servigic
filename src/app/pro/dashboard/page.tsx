import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnlineToggle } from "@/components/dashboard/OnlineToggle";
import { StatCard } from "@/components/dashboard/StatCard";

export default async function ProviderDashboardPage() {
  const session = await auth();
  const profile = await prisma.providerProfile.findUnique({ where: { userId: session!.user.id } });
  if (!profile) return null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todaysDispatches, totalBids, wonBids, earnings] = await Promise.all([
    prisma.dispatchAlert.count({ where: { providerId: profile.id, createdAt: { gte: todayStart } } }),
    prisma.bid.count({ where: { providerId: profile.id } }),
    prisma.bid.count({ where: { providerId: profile.id, status: "ACCEPTED" } }),
    prisma.payout.aggregate({
      where: { providerId: profile.id, status: { in: ["SENT", "CONFIRMED"] } },
      _sum: { amountPKR: true },
    }),
  ]);

  const winRate = totalBids > 0 ? Math.round((wonBids / totalBids) * 100) : 0;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Welcome, {profile.displayName}</h1>
          <p className="text-text-muted">Toggle online to start receiving job alerts.</p>
        </div>
        <OnlineToggle initial={profile.isOnline} />
      </div>

      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        <StatCard label="Today's dispatches" value={todaysDispatches} />
        <StatCard label="Win rate" value={`${winRate}%`} />
        <StatCard label="Total earnings" value={`PKR ${(earnings._sum.amountPKR ?? 0).toLocaleString()}`} />
        <StatCard label="Rating" value={profile.ratingCount > 0 ? profile.ratingAvg.toFixed(1) : "—"} />
      </div>
    </div>
  );
}
