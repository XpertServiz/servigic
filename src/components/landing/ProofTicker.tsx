import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { fmtCurrency, fmtPKR } from "@/lib/format";
import { getMoney } from "@/lib/money";
import { detectVisitorMarket } from "@/lib/geoDetect";
import { getCountryCities } from "@/lib/liveCities";

// Real DB events only — hidden entirely below thresholds (Master Brief §7A, §12: no fake stats).
const MIN_EVENTS_TO_SHOW = 5;

const weekAgoDate = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

export async function ProofTicker() {
  const [t, locale, ts, money] = await Promise.all([getTranslations("ticker"), getLocale(), getTranslations("services.trades"), getMoney()]);
  // Stored amounts are whole units of the market's own currency, so they are shown as they are, never converted.
  const m = (n: number) => (money.currency === "PKR" ? fmtPKR(n, locale) : fmtCurrency(n, locale, money.currency));
  const weekAgo = weekAgoDate();
  // Real events only, and only from the visitor's own country (no Pakistani jobs on a Saudi page).
  const vm = await detectVisitorMarket(locale);
  const ownCities = await getCountryCities(vm.country);
  // A country with no live city has no events to show: the strip stays hidden rather than showing another country's.
  if (ownCities.length === 0) return null;
  const cityFilter = { job: { city: { in: ownCities } } };

  const [recentBids, completedJobs, payoutSum] = await Promise.all([
    prisma.bid.findMany({
      where: { status: "ACCEPTED", createdAt: { gte: weekAgo }, ...cityFilter },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { job: { include: { category: true } } },
    }),
    prisma.booking.count({ where: { status: "COMPLETED", updatedAt: { gte: weekAgo }, ...cityFilter } }),
    prisma.payout.aggregate({ where: { status: { in: ["SENT", "CONFIRMED"] }, sentAt: { gte: weekAgo }, booking: cityFilter }, _sum: { amountPKR: true } }),
  ]);

  const items: string[] = [];
  for (const bid of recentBids) {
    const category = ts.has(bid.job.category.trade) ? ts(bid.job.category.trade) : bid.job.category.name;
    items.push(t("bid", { category, price: m(bid.pricePKR), area: bid.job.city }));
  }
  if (completedJobs > 0) items.push(t("jobsWeek", { count: completedJobs }));
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
