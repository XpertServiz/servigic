import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ConfirmBidButton } from "./ConfirmBidButton";

export const dynamic = "force-dynamic";

export default async function AdminJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      category: true,
      customer: { select: { name: true, phone: true, managedByAdmin: true } },
      bids: {
        orderBy: { pricePKR: "asc" },
        include: { provider: { select: { displayName: true, ratingAvg: true, ratingCount: true, jobsCompleted: true, isVerified: true } }, user: { select: { name: true, phone: true } } },
      },
      booking: { select: { id: true, status: true, totalPKR: true, confirmedByAdminId: true } },
      _count: { select: { dispatchAlerts: true } },
    },
  });
  if (!job) notFound();

  const adminPosted = Boolean(job.postedByAdminId);
  const canConfirm = adminPosted && job.status === "OPEN";

  return (
    <div className="max-w-4xl">
      <Link href="/admin/jobs" className="text-sm text-accent">
        ← Jobs
      </Link>
      <h1 className="mb-1 mt-2 font-display text-3xl font-bold">
        <span className="mr-2">{job.category.icon}</span>
        {job.title}
      </h1>
      <p className="mb-6 text-text-muted">
        {job.areaLabel}, {job.city} · {job.status.replace("_", " ")} · {job._count.dispatchAlerts} pro(s) alerted
        {adminPosted && <span className="ml-2 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">Posted by admin</span>}
      </p>

      <div className="mb-8 grid gap-4 rounded-[14px] border border-border-subtle bg-bg-elevated p-5 text-sm sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-text-muted">Customer</div>
          <div className="font-bold">{job.customer.name}</div>
          <a href={`tel:${job.customer.phone}`} className="text-accent">
            {job.customer.phone}
          </a>
          {job.customer.managedByAdmin && <div className="mt-1 text-xs text-text-muted">No app account yet - linked automatically when they register with this number.</div>}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-text-muted">When</div>
          <div className="font-bold">
            {job.urgency === "SCHEDULED" && job.scheduledAt ? job.scheduledAt.toLocaleString() : job.urgency === "EMERGENCY" ? "Emergency" : "Today"}
          </div>
          {job.budgetPKR != null && <div className="text-text-muted">Budget: PKR {job.budgetPKR.toLocaleString()}</div>}
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs uppercase tracking-wide text-text-muted">Address</div>
          <div>{job.exactAddress}</div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs uppercase tracking-wide text-text-muted">Description</div>
          <div className="whitespace-pre-wrap">{job.description}</div>
        </div>
      </div>

      {job.booking && (
        <div className="mb-8 rounded-[14px] border border-secondary/30 bg-secondary/10 p-4 text-sm">
          Booked - PKR {job.booking.totalPKR.toLocaleString()} · {job.booking.status.replace("_", " ")}
          {job.booking.confirmedByAdminId && " · confirmed by an admin on the customer's behalf"}
        </div>
      )}

      <h2 className="mb-3 font-display text-xl font-bold">Bids ({job.bids.length})</h2>
      {!adminPosted && job.bids.length > 0 && (
        <p className="mb-3 text-sm text-text-muted">The customer posted this job themselves, so only they can confirm a bid.</p>
      )}
      <div className="flex flex-col gap-3">
        {job.bids.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border-subtle bg-bg-elevated p-4">
            <div>
              <div className="font-bold">
                {b.provider.displayName || b.user.name} {b.provider.isVerified && <span className="text-xs text-secondary">verified</span>}
              </div>
              <div className="text-xs text-text-muted">
                {b.provider.ratingCount > 0 ? `${b.provider.ratingAvg.toFixed(1)} stars (${b.provider.ratingCount})` : "No ratings yet"} · {b.provider.jobsCompleted} jobs done ·{" "}
                <a href={`tel:${b.user.phone}`} className="text-accent">
                  {b.user.phone}
                </a>
              </div>
              {b.message && <div className="mt-1 text-sm text-text-muted">&ldquo;{b.message}&rdquo;</div>}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-lg font-bold">PKR {b.pricePKR.toLocaleString()}</div>
                <div className="text-xs text-text-muted">
                  ETA {b.etaMinutes} min · {b.status}
                </div>
              </div>
              {canConfirm && b.status === "PENDING" && <ConfirmBidButton jobId={job.id} bidId={b.id} customerName={job.customer.name} />}
            </div>
          </div>
        ))}
        {job.bids.length === 0 && <p className="rounded-[14px] border border-border-subtle p-6 text-center text-sm text-text-muted">No bids yet.</p>}
      </div>
    </div>
  );
}
