import { auth } from "@/lib/auth";
import { getAdminAccess, maskPhone } from "@/lib/adminAccess";
import { prisma } from "@/lib/prisma";
import { getPrelaunchConfig } from "@/lib/prelaunch";
import { foundingSlotsLeft } from "@/lib/foundingPro";
import { TRADE_LABELS } from "@/lib/prelaunchData";
import { FilterBar } from "@/components/admin/FilterBar";
import { ExportPanel } from "@/components/admin/ExportPanel";
import { COLUMN_SETS } from "@/lib/leadExport";
import { filterToParams, parseFilter, queryWaitlist } from "@/lib/leadFilters";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const session = await auth();
  const f = parseFilter(sp);
  const access = await getAdminAccess(session?.user?.id);
  const [{ rows, total, resolved }, cfg, founding, cities, presets] = await Promise.all([
    queryWaitlist(f),
    getPrelaunchConfig(),
    foundingSlotsLeft(),
    prisma.city.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.savedFilter.findMany({ where: { adminId: session?.user?.id ?? "", resource: "waitlist" }, orderBy: { createdAt: "desc" } }),
  ]);
  const roleCount = (r: string) => rows.filter(({ w }) => w.role === r).length;
  const byCountry = new Map<string, number>();
  for (const { w } of rows) byCountry.set(w.countryCode, (byCountry.get(w.countryCode) ?? 0) + 1);
  const params = filterToParams(f);
  const anyLive = cfg.proAppLive || cfg.customerAppLive;
  const exportLaunch = `/api/admin/waitlist/export?${new URLSearchParams({ ...params, mode: "launch" }).toString()}`;
  const shown = rows.slice(0, 500);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Early list</h1>
      <p className="mb-6 max-w-3xl text-text-muted">
        People who joined from the website. A message is emailed to <b>{cfg.notifyEmail || "(set an email in Settings)"}</b> on every signup. The same WhatsApp number joining again updates its row. Pros who join are also added to Pro Leads.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Total (with filters)", total],
          ["Customers", roleCount("CUSTOMER")],
          ["Pros", roleCount("PROVIDER")],
          [`Founding Pro places left (${founding.rule.city})`, `${founding.left} of ${founding.rule.slots}`],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-[14px] border border-border-subtle bg-bg-elevated p-4">
            <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      <FilterBar
        action="/admin/waitlist"
        f={f}
        fields={["q", "role", "country", "city", "area", "zone", "trade", "dates"]}
        options={{ areas: resolved.areas, cities: cities.map((c) => c.name), zones: resolved.markets.map((m) => ({ id: m.id, name: m.name })) }}
      />
      <ExportPanel canExport={access.canExport} resource="waitlist" columns={COLUMN_SETS.waitlist} filter={params} presets={presets.map((p) => ({ id: p.id, name: p.name, filter: p.filter as Record<string, string> }))} basePath="/admin/waitlist" />
      {anyLive && access.canExport && (
        <p className="mb-5">
          <a href={exportLaunch} className="rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-secondary-foreground">
            Send launch message (CSV of WhatsApp numbers + emails)
          </a>
        </p>
      )}

      {byCountry.size > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {[...byCountry.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([c, n]) => (
              <a key={c} href={`/admin/waitlist?${new URLSearchParams({ ...params, country: c }).toString()}`} className="rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-xs text-text-muted hover:border-accent/60">
                {c}: <b className="text-text">{n}</b>
              </a>
            ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-3">Joined</th>
              <th className="p-3">Role</th>
              <th className="p-3">Name</th>
              <th className="p-3">WhatsApp</th>
              <th className="p-3">Country</th>
              <th className="p-3">City / area</th>
              <th className="p-3">Email</th>
              <th className="p-3">Trade / exp.</th>
              <th className="p-3">Gmail</th>
              <th className="p-3">Lang</th>
              <th className="p-3">Referred by</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ w, loc }) => {
              const area = resolved.areas.find((a) => a.id === loc.areaId);
              return (
                <tr key={w.id} className="border-t border-border-subtle align-top">
                  <td className="p-3 whitespace-nowrap text-text-muted">{w.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="p-3">{w.role === "PROVIDER" ? "Pro" : "Customer"}</td>
                  <td className="p-3 font-semibold">{w.name}</td>
                  <td className="p-3 whitespace-nowrap" dir="ltr">{access.maskPhones ? maskPhone(w.whatsapp) : w.whatsapp}</td>
                  <td className="p-3 text-text-muted">
                    {w.countryCode}
                    {w.detectedCountry && w.detectedCountry !== w.countryCode ? ` (${w.detectedCountry})` : ""}
                  </td>
                  <td className="p-3 text-text-muted">{[w.city, area?.name ?? w.area].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="p-3 text-text-muted" dir="ltr">{w.email ?? "—"}</td>
                  <td className="p-3 text-text-muted">
                    {w.trade ? `${TRADE_LABELS[w.trade as keyof typeof TRADE_LABELS] ?? w.trade}${w.experienceYears != null ? ` · ${w.experienceYears}y` : ""}` : "—"}
                  </td>
                  <td className="p-3 text-text-muted" dir="ltr">{w.gmail ?? "—"}</td>
                  <td className="p-3 text-text-muted">{w.language}</td>
                  <td className="p-3 font-mono text-xs text-text-muted">{w.referredByCode ?? "—"}</td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={11} className="p-6 text-center text-text-muted">
                  No signups match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > shown.length && <p className="mt-3 text-xs text-text-muted">Showing the newest {shown.length} of {total}. The export has all of them.</p>}
    </div>
  );
}
