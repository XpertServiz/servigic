import { prisma } from "@/lib/prisma";
import { ProviderRow } from "./ProviderRow";

export default async function AdminProvidersPage() {
  const providers = await prisma.providerProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, phone: true, city: true, createdAt: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Providers</h1>
      <p className="mb-8 text-text-muted">Verify documents, set levels, or suspend providers.</p>

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">Pro</th>
              <th className="p-4">Phone / City</th>
              <th className="p-4">Trades</th>
              <th className="p-4">Docs</th>
              <th className="p-4">Level</th>
              <th className="p-4">Rating</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <ProviderRow key={p.id} provider={p} />
            ))}
            {providers.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-text-muted">
                  No providers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
