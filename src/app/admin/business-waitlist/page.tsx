import { prisma } from "@/lib/prisma";

export default async function AdminBusinessWaitlistPage() {
  const entries = await prisma.businessWaitlistEntry.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Servigic for Business — Waitlist</h1>
      <p className="mb-8 text-text-muted">
        Signups from the /business waitlist form — the full property-manager module isn&apos;t built yet, so reach
        out manually for now.
      </p>
      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">Company</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Email</th>
              <th className="p-4">Units</th>
              <th className="p-4">City</th>
              <th className="p-4">Joined</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-border-subtle">
                <td className="p-4 font-semibold">{e.companyName}</td>
                <td className="p-4">{e.contactName}</td>
                <td className="p-4 text-text-muted">{e.phone}</td>
                <td className="p-4 text-text-muted">{e.email ?? "—"}</td>
                <td className="p-4 text-text-muted">{e.unitCount ?? "—"}</td>
                <td className="p-4 text-text-muted">{e.city ?? "—"}</td>
                <td className="p-4 text-text-muted">{e.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-text-muted">
                  No signups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
