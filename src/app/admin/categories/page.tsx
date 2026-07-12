import { prisma } from "@/lib/prisma";
import { CategoryRow } from "./CategoryRow";

const LAUNCH_CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi"];

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
          <CategoryRow key={c.id} category={c} launchCities={LAUNCH_CITIES} />
        ))}
      </div>
    </div>
  );
}
