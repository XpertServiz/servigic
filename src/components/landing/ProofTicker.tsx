import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { publicAreaLabel } from "@/lib/anon";
import { fmtMoney, fmtNumber } from "@/lib/format";
import { getMoney } from "@/lib/money";

// Real DB events only — hidden entirely below thresholds (Master Brief §7A, §12: no fake stats).
const MIN_EVENTS_TO_SHOW = 5;

const weekAgoDate = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

export async function ProofTicker() {
  const [t, locale, ts, money] = await Promise.all([getTranslations("ticker"), getLocale(), getTranslations("services.trades"), getMoney()]);
  const m = (n: number) => fmtMoney(n, locale, money.currency, money.rate);
  const weekAgo = weekAgoDate();

  const [recentBids, completedJobs, payoutSum] = await Promise.all([
    prisma.bid.findMany({
      where: { status: "ACCEPTED", createdAt: { gte: weekAgo } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { job: { include: { category: true } } },
    }),
    prisma.booking.count({ where: { status: "COMPLETED", updatedAt: { gte: weekAgo } } }),
    prisma.payout.aggregate({ where: { status: { in: ["SENT", "CONFIRMED"] }, sentAt: { gte: weekAgo } }, _sum: { amountPKR: true } }),
  ]);

  const items: string[] = [];
  for (const bid of recentBids) {
    const category = ts.has(bid.job.category.trade) ? ts(bid.job.category.trade) : bid.job.category.name;
    items.push(t("bid", { category, price: m(bid.pricePKR), area: publicAreaLabel(bid.job.areaLabel) }));
  }
  if (completedJobs > 0) items.push(t("jobsWeek", { count: fmtNumber(completedJobs, locale) }));
  if (payoutSum._sum.amountPKR) items.push(t("paidWeek", { amount: m(payoutSum._sum.amountPKR) }));

  if (items.length < MIN_EVENTS_TO_SHOW) return null;
  const track = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-white/[0.06] bg-bg-elevated/60 py-4" dir="ltr">
      <div className="animate-marquee flex w-max gap-12 whitespace-nowrap">
        {track.map((item, i) => (
          <span key={i} className="flex items-center gap-12 text-sm text-text-muted">
            {item}
            <span className="text-accent/60" aria-hidden>
              ✦
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
