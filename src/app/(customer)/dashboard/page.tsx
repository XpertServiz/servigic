import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runExpirySweep } from "@/lib/expiry";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-accent border-accent/30 bg-accent/10",
  BOOKED: "text-secondary border-secondary/30 bg-secondary/10",
  IN_PROGRESS: "text-secondary border-secondary/30 bg-secondary/10",
  COMPLETED: "text-text-muted border-border-subtle",
  EXPIRED: "text-danger border-danger/30 bg-danger/10",
  CANCELLED: "text-danger border-danger/30 bg-danger/10",
  DISPUTED: "text-danger border-danger/30 bg-danger/10",
};

export default async function CustomerDashboardPage() {
  await runExpirySweep();
  const session = await auth();

  const jobs = await prisma.job.findMany({
    where: { customerId: session!.user.id },
    orderBy: { createdAt: "desc" },
    include: { category: true, _count: { select: { bids: true } } },
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">My Jobs</h1>
          <p className="text-text-muted">Track bids, bookings, and completed work.</p>
        </div>
        <Link href="/jobs/new" className="rounded-[10px] bg-accent px-5 py-3 font-bold text-accent-foreground">
          Post a Job →
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="flex items-center justify-between rounded-[12px] border border-border-subtle bg-bg-elevated p-5 hover:border-accent"
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{job.category.icon}</span>
              <div>
                <div className="font-bold">{job.title}</div>
                <div className="text-sm text-text-muted">
                  {job.areaLabel} · {job._count.bids} bid{job._count.bids === 1 ? "" : "s"}
                </div>
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_COLORS[job.status]}`}>
              {job.status.replace("_", " ")}
            </span>
          </Link>
        ))}
        {jobs.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No jobs yet.{" "}
            <Link href="/jobs/new" className="font-semibold text-accent">
              Post your first job →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
