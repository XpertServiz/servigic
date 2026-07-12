import { prisma } from "@/lib/prisma";
import { PriceBenchmarksClient } from "./PriceBenchmarksClient";

export default async function AdminPriceBenchmarksPage() {
  const benchmarks = await prisma.priceBenchmark.findMany({
    orderBy: [{ city: "asc" }, { categoryId: "asc" }],
    include: { category: { select: { name: true, icon: true } }, subService: { select: { name: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Price Benchmarks</h1>
      <p className="mb-8 text-text-muted">
        Real winning-bid price ranges per category/city, computed from completed jobs only (minimum 5 jobs before a
        range is shown anywhere). Rebuilt on demand — no live cron is wired up yet, so recompute manually after a
        batch of jobs completes, or wire the button below into a scheduled trigger later.
      </p>
      <PriceBenchmarksClient
        benchmarks={benchmarks.map((b) => ({
          id: b.id,
          categoryName: b.category.name,
          categoryIcon: b.category.icon,
          subServiceName: b.subService?.name ?? null,
          city: b.city,
          windowDays: b.windowDays,
          sampleSize: b.sampleSize,
          avgWinningPKR: b.avgWinningPKR,
          medianWinningPKR: b.medianWinningPKR,
          minPKR: b.minPKR,
          maxPKR: b.maxPKR,
          updatedAt: b.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
