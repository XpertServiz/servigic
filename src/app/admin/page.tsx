import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/StatCard";

export default async function AdminOverviewPage() {
  const [users, providers, openJobs, pendingVerification, pendingPayments] = await Promise.all([
    prisma.user.count(),
    prisma.providerProfile.count(),
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.providerProfile.count({ where: { isVerified: false } }),
    prisma.payment.count({ where: { status: "SUBMITTED" } }),
  ]);

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl font-bold">Cockpit</h1>
      <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
        <StatCard label="Total users" value={users} />
        <StatCard label="Providers" value={providers} />
        <StatCard label="Open jobs" value={openJobs} />
        <StatCard label="Pending verification" value={pendingVerification} />
        <StatCard label="Payments to verify" value={pendingPayments} />
      </div>
    </div>
  );
}
