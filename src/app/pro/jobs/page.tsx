import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runExpirySweep } from "@/lib/expiry";
import { findJobsForProvider } from "@/lib/dispatch";
import { DispatchFeedWatcher } from "./DispatchFeedWatcher";

const URGENCY_STYLE: Record<string, string> = {
  EMERGENCY: "text-danger border-danger/30 bg-danger/10",
  TODAY: "text-accent border-accent/30 bg-accent/10",
  SCHEDULED: "text-text-muted border-border-subtle",
};

export default async function ProviderJobFeedPage() {
  await runExpirySweep();
  const session = await auth();
  const profile = await prisma.providerProfile.findUnique({ where: { userId: session!.user.id } });
  if (!profile) return null;

  const jobs = profile.trades.length > 0 ? await findJobsForProvider(profile.id) : [];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Job Feed</h1>
          <p className="text-text-muted">Live jobs matching your trades within {profile.serviceRadiusKm} km.</p>
        </div>
        <DispatchFeedWatcher initialCount={jobs.length} />
      </div>

      {!profile.isOnline && (
        <div className="mb-6 rounded-[10px] border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">
          You&apos;re offline — go online from the dashboard to receive alerts and bid on jobs.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {jobs.map((job) => {
          const alreadyBid = job.bids.length > 0;
          return (
            <Link
              key={job.id}
              href={`/pro/jobs/${job.id}`}
              className="flex items-center justify-between rounded-[12px] border border-border-subtle bg-bg-elevated p-5 hover:border-accent"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{job.category.icon}</span>
                <div>
                  <div className="font-bold">{job.title}</div>
                  <div className="text-sm text-text-muted">
                    {job.areaLabel} · {job.category.name}
                    {job.budgetPKR ? ` · Budget PKR ${job.budgetPKR.toLocaleString()}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {alreadyBid && (
                  <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-xs font-bold text-secondary">
                    Bid sent
                  </span>
                )}
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${URGENCY_STYLE[job.urgency]}`}>
                  {job.urgency}
                </span>
              </div>
            </Link>
          );
        })}
        {jobs.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No matching jobs right now. New jobs in your trades and area will appear here instantly.
          </div>
        )}
      </div>
    </div>
  );
}
