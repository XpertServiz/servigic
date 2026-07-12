import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LIVE_CITIES } from "@/lib/markets";
import { PlansClient } from "./PlansClient";

export default async function CustomerPlansPage() {
  const session = await auth();

  const [plans, categories] = await Promise.all([
    prisma.maintenancePlan.findMany({
      where: { customerId: session!.user.id },
      orderBy: { createdAt: "desc" },
      include: { category: { select: { name: true, icon: true } } },
    }),
    prisma.serviceCategory.findMany({ select: { id: true, name: true, icon: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Maintenance Plans</h1>
      <p className="mb-8 text-text-muted">
        Set it and forget it — we&apos;ll automatically post a job for your next visit a few days before it&apos;s due.
      </p>
      <PlansClient
        plans={plans.map((p) => ({
          id: p.id,
          categoryName: p.category.name,
          categoryIcon: p.category.icon,
          areaLabel: p.areaLabel,
          frequency: p.frequency,
          pricePerVisitPKR: p.pricePerVisitPKR,
          nextDueDate: p.nextDueDate.toISOString(),
          status: p.status,
        }))}
        categories={categories}
        cities={LIVE_CITIES}
      />
    </div>
  );
}
