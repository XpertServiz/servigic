import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/ui/Reveal";
import { detectMarket, detectVisitorMarket } from "@/lib/geoDetect";
import { getCountryCities } from "@/lib/liveCities";
import { publicAreaLabel } from "@/lib/anon";
import { fmtCompactPKR, fmtNumber } from "@/lib/format";

// Compact amount in the visitor's own currency (stored amounts are already whole units of it): SAR 1.2K, CA$ 3.4K ...
function compactMoney(n: number, locale: string, currency: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
}
import { ReviewsCarousel } from "@/components/landing/ReviewsCarousel";

// Lowered from 20 — at launch, waiting for 20 real completed jobs before
// showing any numbers means the section stays blank for weeks. 3 is still
// "real, not embarrassing," and LiveRefresher (see page.tsx) makes the
// count visibly climb in near-real-time as more jobs finish.
const MIN_COMPLETED_JOBS = 3;

async function getAvgTimeToFirstBidMinutes(cities: string[]): Promise<number | null> {
  // First bid per job, for jobs that got at least one — real elapsed time
  // from posting to first bid landing, not a hardcoded "< 10 min" claim.
  const jobs = await prisma.job.findMany({
    where: { bids: { some: {} }, city: { in: cities } },
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

// Only the visitor's own country counts: no Pakistani jobs on a Saudi page and the other way round.
async function getStats(cities: string[]) {
  if (cities.length === 0) return { completedJobs: 0, payoutTotal: 0, reviews: [], avgTimeToFirstBidMin: null };
  const jobScope = { job: { city: { in: cities } } };
  try {
    const [completedJobs, payoutSum, reviews, avgTimeToFirstBidMin] = await Promise.all([
      prisma.booking.count({ where: { status: "COMPLETED", ...jobScope } }),
      prisma.payout.aggregate({ where: { status: { in: ["SENT", "CONFIRMED"] }, booking: jobScope }, _sum: { amountPKR: true } }),
      prisma.review.findMany({
        where: { booking: jobScope },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { booking: { include: { job: { include: { category: true } } } } },
      }),
      getAvgTimeToFirstBidMinutes(cities),
    ]);
    return { completedJobs, payoutTotal: payoutSum._sum.amountPKR ?? 0, reviews, avgTimeToFirstBidMin };
  } catch {
    return { completedJobs: 0, payoutTotal: 0, reviews: [], avgTimeToFirstBidMin: null };
  }
}

export async function Results() {
  const locale = await getLocale();
  const vm = await detectVisitorMarket(locale);
  const cities = await getCountryCities(vm.country);
  const [t, ts, { completedJobs, payoutTotal, reviews, avgTimeToFirstBidMin }, market] = await Promise.all([
    getTranslations("results"),
    getTranslations("services.trades"),
    getStats(cities),
    detectMarket(),
  ]);
  const belowThreshold = completedJobs < MIN_COMPLETED_JOBS;
  const payoutLabel = belowThreshold ? "—" : market.currency === "PKR" ? fmtCompactPKR(payoutTotal, locale) : compactMoney(payoutTotal, locale, market.currency);
  const firstBidLabel =
    belowThreshold || avgTimeToFirstBidMin === null
      ? "—"
      : avgTimeToFirstBidMin < 1
        ? t("lessThanMin")
        : avgTimeToFirstBidMin < 60
          ? t("minutes", { n: avgTimeToFirstBidMin })
          : t("hours", { n: (avgTimeToFirstBidMin / 60).toFixed(1) });

  const stats = [
    { value: belowThreshold ? "—" : fmtNumber(completedJobs, locale), label: t("jobs") },
    { value: payoutLabel, label: t("paid") },
    { value: firstBidLabel, label: t("firstBid") },
  ];

  return (
    <section className="container-x py-16 md:py-24">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} sub={belowThreshold ? t("launchNote") : undefined} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <div className="sv-card p-7 text-center">
              <div className="text-4xl font-extrabold tracking-[-0.018em] text-accent" dir="ltr">
                {s.value}
              </div>
              <div className="mt-2 text-sm text-text-muted">{s.label}</div>
            </div>
          </Reveal>
        ))}
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
              categoryName: ts.has(r.booking.job.category.trade) ? ts(r.booking.job.category.trade) : r.booking.job.category.name,
            }))}
        />
      )}
    </section>
  );
}
