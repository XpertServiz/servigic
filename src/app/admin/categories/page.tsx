import { prisma } from "@/lib/prisma";
import { LIVE_CITIES, COMING_SOON_CITIES } from "@/lib/markets";
import { CategoryRow } from "./CategoryRow";

export default async function AdminCategoriesPage() {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { name: "asc" },
    include: { subServices: true },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Categories</h1>
      <p className="mb-8 text-text-muted">Manage trades, per-city activation, and price ranges shown on the landing page.</p>

      <div className="flex flex-col gap-4">
        {categories.map((c) => (
          <CategoryRow key={c.id} category={c} launchCities={LIVE_CITIES} comingSoonCities={COMING_SOON_CITIES} />
        ))}
      </div>
    </div>
  );
}
