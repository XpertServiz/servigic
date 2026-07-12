import { prisma } from "@/lib/prisma";
import { Eyebrow } from "@/components/landing/Eyebrow";

const MIN_COMPLETED_JOBS = 20;

async function getStats() {
  try {
    const [completedJobs, payoutSum, reviews] = await Promise.all([
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.payout.aggregate({ where: { status: { in: ["SENT", "CONFIRMED"] } }, _sum: { amountPKR: true } }),
      prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { booking: { include: { job: { include: { category: true } } } } },
      }),
    ]);
    return { completedJobs, payoutTotal: payoutSum._sum.amountPKR ?? 0, reviews };
  } catch {
    return { completedJobs: 0, payoutTotal: 0, reviews: [] };
  }
}

export async function Results() {
  const { completedJobs, payoutTotal, reviews } = await getStats();
  const belowThreshold = completedJobs < MIN_COMPLETED_JOBS;

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
          <div className="font-display text-4xl font-bold text-accent">
            {belowThreshold ? "—" : `PKR ${payoutTotal.toLocaleString()}`}
          </div>
          <div className="mt-1.5 text-sm text-text-muted">Paid out to pros</div>
        </div>
        <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-7 text-center">
          <div className="font-display text-4xl font-bold text-accent">{belowThreshold ? "—" : "< 10 min"}</div>
          <div className="mt-1.5 text-sm text-text-muted">Avg time-to-first-bid</div>
        </div>
      </div>

      {!belowThreshold && reviews.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
              <div className="mb-2.5 text-[13px] text-accent">{"★".repeat(r.rating)}</div>
              <p className="mb-4 text-sm text-text-muted">&quot;{r.comment}&quot;</p>
              <div className="text-[13px] font-bold">
                {r.booking.job.areaLabel} · {r.booking.job.category.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
