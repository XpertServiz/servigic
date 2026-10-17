import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/StatCard";
import { getPaymentMode } from "@/lib/featureFlags";
import { effectiveCommissionPct, getFoundingRule } from "@/lib/foundingPro";

const STATUS_COLORS: Record<string, string> = {
  QUEUED: "text-accent border-accent/30 bg-accent/10",
  SENT: "text-secondary border-secondary/30 bg-secondary/10",
  CONFIRMED: "text-secondary border-secondary/30 bg-secondary/10",
  FAILED: "text-danger border-danger/30 bg-danger/10",
};

const LEDGER_TYPE_TONE: Record<string, string> = {
  COMMISSION_DEBIT: "text-danger",
  TOPUP_CREDIT: "text-secondary",
  ADJUSTMENT: "text-text-muted",
  REFERRAL_BONUS: "text-secondary",
};

export default async function ProviderEarningsPage() {
  const session = await auth();
  const profile = await prisma.providerProfile.findUnique({ where: { userId: session!.user.id } });
  if (!profile) return null;

  const paymentMode = await getPaymentMode();
  const foundingRule = await getFoundingRule();
  const pct = effectiveCommissionPct(profile, foundingRule);
  const foundingUntil = profile.foundingUntil && profile.foundingUntil > new Date() ? profile.foundingUntil : null;

  if (paymentMode === "CASH_WALLET") {
    const wallet = await prisma.proWallet.findUnique({
      where: { providerId: profile.id },
      include: {
        ledgerEntries: { orderBy: { createdAt: "desc" }, include: { booking: { include: { job: { select: { title: true } } } } } },
      },
    });
    const balancePKR = wallet?.balancePKR ?? 0;
    const ceilingPKR = wallet?.ceilingPKR ?? 3000;
    const debtPKR = Math.max(0, -balancePKR);

    return (
      <div>
        <h1 className="mb-1 font-display text-3xl font-bold">Earnings</h1>
        <p className="mb-8 text-text-muted">
          No lead fees — you collect full payment from the customer. Just {pct}% commission on
          completed jobs, settled from your wallet.
        </p>
        {foundingUntil && (
          <div className="mb-8 rounded-[12px] border border-accent/30 bg-accent/10 p-4 text-sm">
            <p className="font-semibold text-accent">
              Founding Pro — {pct}% commission until {foundingUntil.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="text-text-muted">You keep {100 - pct}% of every job.</p>
          </div>
        )}

        <div className="mb-8 grid grid-cols-2 gap-5 md:grid-cols-3">
          <StatCard
            label={balancePKR < 0 ? "You owe Servigic" : "Wallet settled"}
            value={`PKR ${Math.abs(balancePKR).toLocaleString()}`}
          />
          <StatCard label="Debt ceiling" value={`PKR ${ceilingPKR.toLocaleString()}`} />
          <StatCard label="Dispatch status" value={profile.dispatchStatus} />
        </div>

        {debtPKR > 0 && (
          <div className="mb-8 h-2 w-full max-w-md overflow-hidden rounded-full bg-border-subtle">
            <div
              className={`h-full ${debtPKR >= ceilingPKR ? "bg-danger" : debtPKR >= ceilingPKR * 0.8 ? "bg-accent" : "bg-secondary"}`}
              style={{ width: `${Math.min(100, Math.round((debtPKR / ceilingPKR) * 100))}%` }}
            />
          </div>
        )}

        <div className="mb-8 rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
          <div className="mb-1 text-sm font-bold">Your Servigic profile value</div>
          <div className="flex gap-6 text-sm text-text-muted">
            <span>★ {profile.ratingAvg.toFixed(1)} rating</span>
            <span>{profile.jobsCompleted} jobs completed</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Every on-platform job builds this — it&apos;s your business&apos;s track record, not counted anywhere off-app.
          </p>
        </div>

        <h2 className="mb-4 font-display text-xl font-bold uppercase">Ledger</h2>
        <div className="flex flex-col gap-3">
          {(wallet?.ledgerEntries ?? []).map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
              <div>
                <div className="font-semibold">{l.memo ?? l.type}</div>
                {l.booking && <div className="text-xs text-text-muted">{l.booking.job.title}</div>}
              </div>
              <span className={`font-bold ${LEDGER_TYPE_TONE[l.type] ?? ""}`}>
                {l.type === "COMMISSION_DEBIT" ? "-" : "+"}PKR {l.amountPKR.toLocaleString()}
              </span>
            </div>
          ))}
          {(!wallet || wallet.ledgerEntries.length === 0) && (
            <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
              No ledger entries yet — complete a job to see commission activity here.
            </div>
          )}
        </div>
      </div>
    );
  }

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
        <StatCard label="Commission" value={`${pct}%`} />
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
