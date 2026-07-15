import { prisma } from "@/lib/prisma";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { detectMarket } from "@/lib/geoDetect";
import { formatApproxFromPKR } from "@/lib/currency";
import { publicAreaLabel } from "@/lib/anon";
import { ReviewsCarousel } from "@/components/landing/ReviewsCarousel";

// Lowered from 20 — at launch, waiting for 20 real completed jobs before
// showing any numbers means the section stays blank for weeks. 3 is still
// "real, not embarrassing," and LiveRefresher (see page.tsx) makes the
// count visibly climb in near-real-time as more jobs finish.
const MIN_COMPLETED_JOBS = 3;

function formatCompactPKR(amount: number): string {
  if (amount >= 1_000_000) return `PKR ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `PKR ${(amount / 1_000).toFixed(1)}K`;
  return `PKR ${amount.toLocaleString()}`;
}

async function getAvgTimeToFirstBidMinutes(): Promise<number | null> {
  // First bid per job, for jobs that got at least one — real elapsed time
  // from posting to first bid landing, not a hardcoded "< 10 min" claim.
  const jobs = await prisma.job.findMany({
    where: { bids: { some: {} } },
    select: { createdAt: true, bids: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } } },
    take: 200,
    orderBy: { createdAt: "desc" },
  });
  const deltas = jobs
    .map((j) => (j.bids[0] ? j.bids[0].createdAt.getTime() - j.createdAt.getTime() : null))
    .filter((ms): ms is number => ms !== null && ms >= 0);
  if (deltas.length === 0) return null;
  return Math.round(deltas.reduce((s, ms) => s + ms, 0) / deltas.length / 60000);
}

async function getStats() {
  try {
    const [completedJobs, payoutSum, reviews, avgTimeToFirstBidMin] = await Promise.all([
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.payout.aggregate({ where: { status: { in: ["SENT", "CONFIRMED"] } }, _sum: { amountPKR: true } }),
      prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { booking: { include: { job: { include: { category: true } } } } },
      }),
      getAvgTimeToFirstBidMinutes(),
    ]);
    return { completedJobs, payoutTotal: payoutSum._sum.amountPKR ?? 0, reviews, avgTimeToFirstBidMin };
  } catch {
    return { completedJobs: 0, payoutTotal: 0, reviews: [], avgTimeToFirstBidMin: null };
  }
}

export async function Results() {
  const [{ completedJobs, payoutTotal, reviews, avgTimeToFirstBidMin }, market] = await Promise.all([getStats(), detectMarket()]);
  const belowThreshold = completedJobs < MIN_COMPLETED_JOBS;
  const payoutLabel = belowThreshold
    ? "—"
    : market.currency === "PKR"
      ? formatCompactPKR(payoutTotal)
      : await formatApproxFromPKR(payoutTotal, market.currency);
  const firstBidLabel =
    belowThreshold || avgTimeToFirstBidMin === null
      ? "—"
      : avgTimeToFirstBidMin < 1
        ? "< 1 min"
        : avgTimeToFirstBidMin < 60
          ? `~${avgTimeToFirstBidMin} min`
          : `~${(avgTimeToFirstBidMin / 60).toFixed(1)} hr`;

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24 md:py-32">
      <div className="mb-16 max-w-[640px]">
        <Eyebrow>Results</Eyebrow>
        <h2 className="font-display text-[clamp(32px,5vw,52px)] font-bold uppercase leading-tight">
          REAL NUMBERS. NO INVENTED STATS.
        </h2>
        {belowThreshold && (
          <p className="mt-4 text-lg text-text-muted">
            Launch-stage — figures update live once thresholds are met. No fake testimonials, ever.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-7 text-center">
          <div className="font-display text-4xl font-bold text-accent">{belowThreshold ? "—" : completedJobs.toLocaleString()}</div>
          <div className="mt-1.5 text-sm text-text-muted">Jobs completed</div>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-7 text-center">
          <div className="font-display text-4xl font-bold text-accent">{payoutLabel}</div>
          <div className="mt-1.5 text-sm text-text-muted">Paid out to pros</div>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-7 text-center">
          <div className="font-display text-4xl font-bold text-accent">{firstBidLabel}</div>
          <div className="mt-1.5 text-sm text-text-muted">Avg time-to-first-bid</div>
        </div>
      </div>

      {!belowThreshold && reviews.length > 0 && (
        <ReviewsCarousel
          reviews={reviews
            .filter((r) => r.comment)
            .map((r) => ({
              id: r.id,
              rating: r.rating,
              comment: r.comment as string,
              areaLabel: publicAreaLabel(r.booking.job.areaLabel),
              categoryName: r.booking.job.category.name,
            }))}
        />
      )}
    </section>
  );
}
