import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProPlansPage() {
  const session = await auth();
  const profile = await prisma.providerProfile.findUnique({ where: { userId: session!.user.id } });
  if (!profile) return null;

  const plans = await prisma.maintenancePlan.findMany({
    where: { preferredProviderId: profile.id, status: "ACTIVE" },
    orderBy: { nextDueDate: "asc" },
    include: { category: { select: { name: true, icon: true } }, customer: { select: { name: true } } },
  });

  const monthlyRecurringPKR = plans.reduce((sum, p) => {
    const visitsPerMonth = p.frequency === "MONTHLY" ? 1 : p.frequency === "QUARTERLY" ? 1 / 3 : 1 / 6;
    return sum + p.pricePerVisitPKR * visitsPerMonth;
  }, 0);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Recurring Customers</h1>
      <p className="mb-8 text-text-muted">
        Customers who&apos;ve set you as their preferred pro for a recurring maintenance plan — steady work, no rebidding.
      </p>

      <div className="mb-6 rounded-[12px] border border-secondary/30 bg-secondary/10 px-5 py-4">
        <div className="font-display text-2xl font-bold text-secondary">~PKR {Math.round(monthlyRecurringPKR).toLocaleString()}</div>
        <div className="text-xs text-text-muted">Estimated recurring revenue per month across {plans.length} plan(s)</div>
      </div>

      <div className="flex flex-col gap-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
            <div className="mb-1 font-bold">
              {p.category.icon} {p.category.name} · {p.customer.name}
            </div>
            <div className="text-sm text-text-muted">
              {p.areaLabel} · {p.frequency.toLowerCase()} · ~PKR {p.pricePerVisitPKR.toLocaleString()}/visit
            </div>
            <div className="mt-1 text-xs text-text-muted">Next visit: {p.nextDueDate.toLocaleDateString()}</div>
          </div>
        ))}
        {plans.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No recurring customers yet — customers can set you as their preferred pro after you complete a job for
            them.
          </div>
        )}
      </div>
    </div>
  );
}
