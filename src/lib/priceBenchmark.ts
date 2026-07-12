import { prisma } from "@/lib/prisma";

// Never show a benchmark built from too few real jobs — Competitive Edge
// Addendum §2.1: "minimum-sample-size gated... never show fabricated ranges."
const MIN_SAMPLE_SIZE = 5;
const WINDOW_OPTIONS = [30, 90] as const;

type Group = { categoryId: string; subServiceId: string | null; city: string; windowDays: number; prices: number[] };

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

// Rebuilds the entire PriceBenchmark table from real completed-booking data.
// Delete-then-insert (not upsert) deliberately — see schema comment on
// PriceBenchmark for why a partial-upsert approach doesn't fit this table.
export async function recomputePriceBenchmarks() {
  const now = Date.now();
  const groups = new Map<string, Group>();

  for (const windowDays of WINDOW_OPTIONS) {
    const windowStart = new Date(now - windowDays * 24 * 60 * 60 * 1000);
    const bookings = await prisma.booking.findMany({
      where: { status: "COMPLETED", updatedAt: { gte: windowStart } },
      select: {
        totalPKR: true,
        bid: { select: { pricePKR: true } },
        job: { select: { categoryId: true, subServiceId: true, city: true } },
      },
    });

    for (const b of bookings) {
      const price = b.bid.pricePKR;
      // Category-level group (subServiceId null — rolls up every sub-service)
      const categoryKey = `${b.job.categoryId}|null|${b.job.city}|${windowDays}`;
      addToGroup(groups, categoryKey, b.job.categoryId, null, b.job.city, windowDays, price);

      // Sub-service-level group, if this job had one
      if (b.job.subServiceId) {
        const subKey = `${b.job.categoryId}|${b.job.subServiceId}|${b.job.city}|${windowDays}`;
        addToGroup(groups, subKey, b.job.categoryId, b.job.subServiceId, b.job.city, windowDays, price);
      }
    }
  }

  const rows = [...groups.values()]
    .filter((g) => g.prices.length >= MIN_SAMPLE_SIZE)
    .map((g) => {
      const sorted = [...g.prices].sort((a, b) => a - b);
      const sum = sorted.reduce((s, p) => s + p, 0);
      return {
        categoryId: g.categoryId,
        subServiceId: g.subServiceId,
        city: g.city,
        windowDays: g.windowDays,
        sampleSize: sorted.length,
        avgWinningPKR: Math.round(sum / sorted.length),
        medianWinningPKR: median(sorted),
        minPKR: sorted[0],
        maxPKR: sorted[sorted.length - 1],
      };
    });

  await prisma.$transaction([prisma.priceBenchmark.deleteMany({}), prisma.priceBenchmark.createMany({ data: rows })]);

  return rows.length;
}

function addToGroup(
  groups: Map<string, Group>,
  key: string,
  categoryId: string,
  subServiceId: string | null,
  city: string,
  windowDays: number,
  price: number
) {
  const existing = groups.get(key);
  if (existing) {
    existing.prices.push(price);
  } else {
    groups.set(key, { categoryId, subServiceId, city, windowDays, prices: [price] });
  }
}

export async function getPriceBenchmark(categoryId: string, city: string, subServiceId?: string | null, windowDays = 30) {
  return prisma.priceBenchmark.findFirst({
    where: { categoryId, city, subServiceId: subServiceId ?? null, windowDays },
  });
}
