import { prisma } from "@/lib/prisma";
import { MaintenancePlansClient } from "./MaintenancePlansClient";

export default async function AdminMaintenancePlansPage() {
  const plans = await prisma.maintenancePlan.findMany({
    orderBy: { nextDueDate: "asc" },
    include: { category: { select: { name: true, icon: true } }, customer: { select: { name: true, phone: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Maintenance Plans</h1>
      <p className="mb-8 text-text-muted">
        No live cron is wired up yet — run the sweep manually (or point a scheduler at{" "}
        <code className="rounded bg-bg-elevated-2 px-1.5 py-0.5 text-xs">POST /api/admin/maintenance-plans/run-sweep</code>{" "}
        later) to auto-post jobs for any plan due within 3 days.
      </p>
      <MaintenancePlansClient
        plans={plans.map((p) => ({
          id: p.id,
          categoryName: p.category.name,
          categoryIcon: p.category.icon,
          customerName: p.customer.name,
          customerPhone: p.customer.phone,
          frequency: p.frequency,
          status: p.status,
          nextDueDate: p.nextDueDate.toISOString(),
        }))}
      />
    </div>
  );
}
