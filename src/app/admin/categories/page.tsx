import { prisma } from "@/lib/prisma";
import { ALL_MARKET_CITIES } from "@/lib/markets";
import { TRADES } from "@/lib/validation/provider";
import { CategoryRow } from "./CategoryRow";
import { AddCategoryButton } from "./AddCategoryButton";

export default async function AdminCategoriesPage() {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { name: "asc" },
    include: { subServices: true },
  });

  const usedTrades = new Set(categories.map((c) => c.trade));
  const availableTrades = TRADES.filter((t) => !usedTrades.has(t));

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-3xl font-bold">Categories</h1>
          <p className="text-text-muted">
            Manage trades, city targeting, and price ranges shown on the landing page. City toggles here only control
            SEO/display targeting — they don&apos;t open real bookings in non-PKR markets (see GCC_EXPANSION.md).
          </p>
        </div>
        <AddCategoryButton availableTrades={availableTrades} />
      </div>

      <div className="flex flex-col gap-4">
        {categories.map((c) => (
          <CategoryRow key={c.id} category={c} allCities={ALL_MARKET_CITIES} />
        ))}
        {categories.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No categories yet — add one above.
          </div>
        )}
      </div>
    </div>
  );
}
