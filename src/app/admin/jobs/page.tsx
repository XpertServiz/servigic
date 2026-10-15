import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/geo";
import { ConciergeClient, type ConciergeJob } from "./ConciergeClient";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-accent border-accent/30 bg-accent/10",
  BOOKED: "text-secondary border-secondary/30 bg-secondary/10",
  IN_PROGRESS: "text-secondary border-secondary/30 bg-secondary/10",
  COMPLETED: "text-text-muted border-border-subtle",
  EXPIRED: "text-danger border-danger/30 bg-danger/10",
  CANCELLED: "text-danger border-danger/30 bg-danger/10",
  DISPUTED: "text-danger border-danger/30 bg-danger/10",
};

// Concierge matching (handoff section 11.2): open jobs nobody has bid on yet, oldest first, with the
// verified active pros who could take them, so an admin can hand a job to a pro by phone/alert.
async function getUnmatched(): Promise<ConciergeJob[]> {
  const open = await prisma.job.findMany({
    where: { status: "OPEN", biddingClosesAt: { gt: new Date() }, bids: { none: {} } },
    orderBy: { createdAt: "asc" },
    take: 30,
    include: { category: true, customer: { select: { name: true, phone: true } }, _count: { select: { dispatchAlerts: true } } },
  });
  return Promise.all(
    open.map(async (j) => {
      const pros = await prisma.providerProfile.findMany({
        where: { isVerified: true, activation: "ACTIVE", trades: { has: j.category.trade }, user: { city: j.city } },
        include: { user: { select: { name: true, phone: true } } },
        take: 30,
      });
      const candidates = pros
        .map((p) => ({
          id: p.id,
          name: p.displayName || p.user.name,
          phone: p.user.phone,
          online: p.isOnline,
          distanceKm: p.baseLat != null && p.baseLng != null ? haversineKm(j.lat, j.lng, p.baseLat, p.baseLng) : null,
        }))
        .sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9))
        .slice(0, 8);
      return {
        id: j.id,
        title: j.title,
        icon: j.category.icon,
        city: j.city,
        areaLabel: j.areaLabel,
        ageMin: Math.round((Date.now() - j.createdAt.getTime()) / 60000),
        notified: j._count.dispatchAlerts,
        customerName: j.customer.name,
        customerPhone: j.customer.phone,
        candidates,
      };
    }),
  );
}

export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  const unmatched = await getUnmatched();
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { category: true, customer: { select: { name: true, city: true } }, _count: { select: { bids: true } } },
  });

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Jobs</h1>
        <Link href="/admin/jobs/new" className="rounded-[10px] bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground">
          + Post a job for a customer
        </Link>
      </div>
      <p className="mb-8 text-text-muted">Unmatched open jobs first (concierge matching), then every job on the platform.</p>

      <h2 className="mb-3 font-display text-xl font-bold">Unmatched open jobs</h2>
      <div className="mb-10">
        <ConciergeClient jobs={unmatched} />
      </div>

      <h2 className="mb-3 font-display text-xl font-bold">All jobs</h2>

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">Job</th>
              <th className="p-4">Customer</th>
              <th className="p-4">City</th>
              <th className="p-4">Bids</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-border-subtle">
                <td className="p-4">
                  <Link href={`/admin/jobs/${j.id}`} className="hover:text-accent">
                    <span className="mr-2">{j.category.icon}</span>
                    {j.title}
                  </Link>
                  {j.postedByAdminId && <span className="ml-2 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">ADMIN</span>}
                </td>
                <td className="p-4 text-text-muted">{j.customer.name}</td>
                <td className="p-4 text-text-muted">{j.city}</td>
                <td className="p-4 text-text-muted">{j._count.bids}</td>
                <td className="p-4">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_COLORS[j.status]}`}>
                    {j.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-text-muted">
                  No jobs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
