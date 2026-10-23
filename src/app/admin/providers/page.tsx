import { auth } from "@/lib/auth";
import { getAdminAccess, maskPhone } from "@/lib/adminAccess";
import { prisma } from "@/lib/prisma";
import { FilterBar } from "@/components/admin/FilterBar";
import { ExportPanel } from "@/components/admin/ExportPanel";
import { COLUMN_SETS } from "@/lib/leadExport";
import { filterToParams, parseFilter, queryPros } from "@/lib/leadFilters";
import { ProviderRow } from "./ProviderRow";

export const dynamic = "force-dynamic";

export default async function AdminProvidersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const session = await auth();
  const f = parseFilter(sp);
  const access = await getAdminAccess(session?.user?.id);
  const { rows, total, resolved } = await queryPros(f);
  const [cities, presets] = await Promise.all([
    prisma.city.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.savedFilter.findMany({ where: { adminId: session?.user?.id ?? "", resource: "pros" }, orderBy: { createdAt: "desc" } }),
  ]);
  const shown = rows.slice(0, 300);
  // Skills a pro asked for that still wait for approval: until approved he receives no jobs of that trade.
  const waiting = await prisma.providerTrade.findMany({ where: { providerId: { in: shown.map((r) => r.p.id) }, status: "PENDING" }, select: { providerId: true, trade: true } });
  const pendingByPro = new Map<string, string[]>();
  for (const w of waiting) pendingByPro.set(w.providerId, [...(pendingByPro.get(w.providerId) ?? []), w.trade]);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Providers</h1>
      <p className="mb-6 text-text-muted">Verify documents, set levels, or suspend providers. Filter by area, zone, trade, distance and status, then export the result.</p>

      <FilterBar
        action="/admin/providers"
        f={f}
        fields={["q", "city", "area", "zone", "distance", "trade", "verification", "founding", "dates"]}
        options={{ areas: resolved.areas, cities: cities.map((c) => c.name), zones: resolved.markets.map((m) => ({ id: m.id, name: m.name })) }}
      />
      <ExportPanel canExport={access.canExport} resource="pros" columns={COLUMN_SETS.pros} filter={filterToParams(f)} presets={presets.map((p) => ({ id: p.id, name: p.name, filter: p.filter as Record<string, string> }))} basePath="/admin/providers" />
      <p className="mb-3 text-sm text-text-muted">
        {total} provider{total === 1 ? "" : "s"}
        {total > shown.length ? ` (showing the newest ${shown.length}; the export has all)` : ""}.
      </p>

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
              <th className="p-4">Dispatch</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ p }) => (
              <ProviderRow key={p.id} provider={access.maskPhones ? { ...p, user: { ...p.user, phone: maskPhone(p.user.phone) } } : p} canDelete={access.level === "super_admin"} pendingSkills={pendingByPro.get(p.id) ?? []} />
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-text-muted">
                  No providers match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
