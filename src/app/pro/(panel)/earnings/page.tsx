import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/StatCard";

const STATUS_COLORS: Record<string, string> = {
  QUEUED: "text-accent border-accent/30 bg-accent/10",
  SENT: "text-secondary border-secondary/30 bg-secondary/10",
  CONFIRMED: "text-secondary border-secondary/30 bg-secondary/10",
  FAILED: "text-danger border-danger/30 bg-danger/10",
};

export default async function ProviderEarningsPage() {
  const session = await auth();
  const profile = await prisma.providerProfile.findUnique({ where: { userId: session!.user.id } });
  if (!profile) return null;

  const payouts = await prisma.payout.findMany({
    where: { providerId: profile.id },
    orderBy: { createdAt: "desc" },
    include: { booking: { include: { job: { include: { category: true } } } } },
  });

  const totalSent = payouts.filter((p) => p.status !== "QUEUED").reduce((sum, p) => sum + p.amountPKR, 0);
  const totalQueued = payouts.filter((p) => p.status === "QUEUED").reduce((sum, p) => sum + p.amountPKR, 0);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Earnings</h1>
      <p className="mb-8 text-text-muted">Payout account: {profile.payoutMethod ?? "Not set"} — {profile.payoutAccount ?? "—"}</p>

      <div className="mb-8 grid grid-cols-2 gap-5 md:grid-cols-3">
        <StatCard label="Total earned" value={`PKR ${totalSent.toLocaleString()}`} />
        <StatCard label="Queued for payout" value={`PKR ${totalQueued.toLocaleString()}`} />
        <StatCard label="Commission" value={`${profile.commissionPct}%`} />
      </div>

      <div className="flex flex-col gap-3">
        {payouts.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">{p.booking.job.category.icon}</span>
              <div>
                <div className="font-semibold">{p.booking.job.title}</div>
                <div className="text-xs text-text-muted">PKR {p.amountPKR.toLocaleString()}</div>
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_COLORS[p.status]}`}>{p.status}</span>
          </div>
        ))}
        {payouts.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No payouts yet — complete a job to see earnings here.
          </div>
        )}
      </div>
    </div>
  );
}
