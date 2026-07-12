import { prisma } from "@/lib/prisma";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-accent border-accent/30 bg-accent/10",
  BOOKED: "text-secondary border-secondary/30 bg-secondary/10",
  IN_PROGRESS: "text-secondary border-secondary/30 bg-secondary/10",
  COMPLETED: "text-text-muted border-border-subtle",
  EXPIRED: "text-danger border-danger/30 bg-danger/10",
  CANCELLED: "text-danger border-danger/30 bg-danger/10",
  DISPUTED: "text-danger border-danger/30 bg-danger/10",
};

export default async function AdminJobsPage() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { category: true, customer: { select: { name: true, city: true } }, _count: { select: { bids: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Jobs</h1>
      <p className="mb-8 text-text-muted">All posted jobs across the platform.</p>

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">Job</th>
              <th className="p-4">Customer</th>
              <th className="p-4">City</th>
              <th className="p-4">Bids</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-border-subtle">
                <td className="p-4">
                  <span className="mr-2">{j.category.icon}</span>
                  {j.title}
                </td>
                <td className="p-4 text-text-muted">{j.customer.name}</td>
                <td className="p-4 text-text-muted">{j.city}</td>
                <td className="p-4 text-text-muted">{j._count.bids}</td>
                <td className="p-4">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_COLORS[j.status]}`}>
                    {j.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-text-muted">
                  No jobs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
