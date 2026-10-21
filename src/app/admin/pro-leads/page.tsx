import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getAdminAccess, maskPhone } from "@/lib/adminAccess";
import { prisma } from "@/lib/prisma";
import { FilterBar } from "@/components/admin/FilterBar";
import { ExportPanel } from "@/components/admin/ExportPanel";
import { PinMap, type Pin } from "@/components/admin/PinMap";
import { COLUMN_SETS } from "@/lib/leadExport";
import { filterToParams, leadWhere, parseFilter, queryLeads } from "@/lib/leadFilters";
import { LEAD_STATUS_LABEL } from "@/lib/leads";
import { fillTemplate, joinLink, whatsappLink } from "@/lib/leadTemplates";
import { TRADE_LABELS } from "@/lib/trades";
import { AddLeadForm } from "./AddLeadForm";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  NEW: "#9ca0ae", CONTACTED: "#60a5fa", INTERESTED: "#facc15", INVITED: "#fb923c", REGISTERED: "#22c55e", ONBOARDED: "#22c55e", VERIFIED: "#16a34a",
  ACTIVE: "#15803d", CALLBACK: "#a78bfa", NOT_INTERESTED: "#ef4444", WRONG_NUMBER: "#6b7280", DO_NOT_CONTACT: "#111827",
};
const PAGE_SIZE = 50;
const isPast = (d: Date) => d.getTime() <= Date.now();

export default async function ProLeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const session = await auth();
  const me = session?.user?.id;
  const access = await getAdminAccess(me);
  const f = parseFilter(sp);
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);
  const view = (Array.isArray(sp.view) ? sp.view[0] : sp.view) === "map" ? "map" : "table";

  const { rows, total, resolved } = await queryLeads(f, { page, pageSize: PAGE_SIZE, me, all: view === "map" });
  const where = await leadWhere(f, resolved, me);
  const endOfToday = new Date();
  endOfToday.setUTCHours(23, 59, 59, 999);
  const [counts, dueToday, cities, owners, presets, totalAll] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.lead.count({ where: { callbackDate: { lte: endOfToday }, doNotContact: false } }),
    prisma.city.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true } }),
    prisma.savedFilter.findMany({ where: { adminId: me ?? "", resource: "leads" }, orderBy: { createdAt: "desc" } }),
    prisma.lead.count(),
  ]);

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "www.servigic.com"}`;
  const params = filterToParams(f);
  const qs = (extra: Record<string, string>) => new URLSearchParams({ ...params, ...extra }).toString();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  const pins: Pin[] = rows
    .filter((l) => l.lat != null && l.lng != null)
    .slice(0, 3000)
    .map((l) => ({ lat: l.lat!, lng: l.lng!, color: STATUS_COLOR[l.status] ?? "#9ca0ae", label: `${l.personName ?? l.businessName} · ${LEAD_STATUS_LABEL[l.status] ?? l.status}${access.maskPhones ? "" : ` · ${l.phone}`}` }));
  const zoneRings = resolved.markets.flatMap((m) => m.polygons);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Pro Leads</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/pro-leads/import" className="rounded-full border border-accent/50 px-4 py-2 font-semibold text-accent hover:bg-accent/10">Import CSV / XLSX</Link>
          <Link href="/admin/areas" className="rounded-full border border-border-subtle px-4 py-2 text-text-muted hover:text-text">Areas</Link>
          <Link href="/admin/zones" className="rounded-full border border-border-subtle px-4 py-2 text-text-muted hover:text-text">Zone dashboard</Link>
        </div>
      </div>
      <p className="mb-5 max-w-3xl text-text-muted">
        Everyone we want to invite as a Pro, from every source, one row per phone number. Call or open WhatsApp from the row (WhatsApp only pre-fills the message: you press send). {totalAll} leads in total.
      </p>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href={`/admin/pro-leads?${qs({ followUp: "today", page: "1" })}`} className={`rounded-full border px-4 py-1.5 ${f.followUp ? "border-accent bg-accent/10 text-accent" : "border-border-subtle text-text-muted"}`}>
          Today&apos;s follow-ups ({dueToday})
        </Link>
        <Link href="/admin/pro-leads" className="rounded-full border border-border-subtle px-4 py-1.5 text-text-muted">All leads</Link>
        <Link href={`/admin/pro-leads?${qs({ view: view === "map" ? "table" : "map" })}`} className="rounded-full border border-border-subtle px-4 py-1.5 text-text-muted">
          {view === "map" ? "Show table" : "Show map"}
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-6">
        {["NEW", "CONTACTED", "INTERESTED", "INVITED", "REGISTERED", "VERIFIED"].map((s) => (
          <div key={s} className="rounded-[12px] border border-border-subtle bg-bg-elevated p-3">
            <div className="text-[11px] uppercase tracking-wide text-text-muted">{LEAD_STATUS_LABEL[s]}</div>
            <div className="text-xl font-bold">{countOf(s) + (s === "REGISTERED" ? countOf("ONBOARDED") : 0)}</div>
          </div>
        ))}
      </div>

      <AddLeadForm />

      <FilterBar
        action="/admin/pro-leads"
        f={f}
        fields={["q", "country", "city", "area", "zone", "distance", "trade", "status", "source", "owner", "registered", "consent", "exp", "followUp", "dates", "contacted"]}
        options={{ areas: resolved.areas, cities: cities.map((c) => c.name), zones: resolved.markets.map((m) => ({ id: m.id, name: m.name })), owners }}
      />
      <ExportPanel canExport={access.canExport} resource="leads" columns={COLUMN_SETS.leads} filter={params} presets={presets.map((p) => ({ id: p.id, name: p.name, filter: p.filter as Record<string, string> }))} basePath="/admin/pro-leads" />

      <p className="mb-3 text-sm text-text-muted">
        {total} lead{total === 1 ? "" : "s"} match{total === 1 ? "es" : ""}
        {f.zoneScope === "inside" ? " (inside live zones)" : f.zoneScope === "outside" ? " (outside live zones)" : ""}.
      </p>

      {view === "map" ? (
        <PinMap pins={pins} zones={zoneRings} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Trades</th>
                  <th className="p-3">Area / zone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Follow-up</th>
                  <th className="p-3">Contact</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const area = resolved.areas.find((a) => a.id === l.areaId);
                  const zone = resolved.markets.find((m) => m.id === l.zoneId);
                  const trades = (l.trades.length ? l.trades : [l.trade]).map((t) => TRADE_LABELS[t]?.name ?? t).join(", ");
                  const msg = fillTemplate("rur", { name: l.personName ?? l.businessName, trade: trades.split(",")[0], area: area?.name ?? l.areaLabel, joinLink: joinLink(origin, l.refCode) });
                  const overdue = l.callbackDate ? isPast(l.callbackDate) : false;
                  return (
                    <tr key={l.id} className="border-t border-border-subtle align-top">
                      <td className="p-3">
                        <Link href={`/admin/pro-leads/${l.id}`} className="font-semibold hover:text-accent">{l.personName ?? l.businessName}</Link>
                        {l.personName && l.businessName && l.businessName !== l.personName && <div className="text-xs text-text-muted">{l.businessName}</div>}
                        <div className="text-xs text-text-muted" dir="ltr">{access.maskPhones ? maskPhone(l.phone) : l.phone}</div>
                      </td>
                      <td className="p-3 text-text-muted">{trades}</td>
                      <td className="p-3 text-text-muted">
                        {area?.name ?? l.areaLabel ?? l.areaRaw ?? "—"}
                        {!area && (l.areaRaw || l.areaLabel) && <span className="ms-1 rounded bg-accent/15 px-1 text-[10px] text-accent">unmatched</span>}
                        <div className="text-xs">{zone ? `Zone: ${zone.name}` : "outside zones"}</div>
                      </td>
                      <td className="p-3">
                        <span className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: STATUS_COLOR[l.status], color: STATUS_COLOR[l.status] }}>{LEAD_STATUS_LABEL[l.status] ?? l.status}</span>
                        {l.consent !== "yes" && <div className="mt-1 text-[10px] text-text-muted">consent: {l.consent}</div>}
                      </td>
                      <td className="p-3 text-xs text-text-muted">{l.source.replace(/_/g, " ").toLowerCase()}</td>
                      <td className={`p-3 text-xs ${overdue ? "font-semibold text-danger" : "text-text-muted"}`}>{l.callbackDate ? l.callbackDate.toISOString().slice(0, 10) : "—"}</td>
                      <td className="p-3">
                        {l.doNotContact || l.status === "DO_NOT_CONTACT" ? (
                          <span className="text-xs text-danger">Do not contact</span>
                        ) : access.maskPhones ? (
                          <span className="text-xs text-text-muted">Number hidden</span>
                        ) : (
                          <div className="flex gap-2">
                            <a href={`tel:${l.phone}`} className="rounded-full border border-border-subtle px-3 py-1 text-xs hover:border-accent">Call</a>
                            <a href={whatsappLink(l.phone, msg)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-[#06170d]">WhatsApp</a>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-text-muted">No leads match.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="mt-4 flex items-center gap-3 text-sm">
              {page > 1 && <Link href={`/admin/pro-leads?${qs({ page: String(page - 1) })}`} className="rounded-full border border-border-subtle px-4 py-1.5">← Previous</Link>}
              <span className="text-text-muted">Page {page} of {pages}</span>
              {page < pages && <Link href={`/admin/pro-leads?${qs({ page: String(page + 1) })}`} className="rounded-full border border-border-subtle px-4 py-1.5">Next →</Link>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
