import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAdminAccess, maskPhone } from "@/lib/adminAccess";
import { getMarkets } from "@/lib/marketConfig";
import { LEAD_STATUS_LABEL } from "@/lib/leads";
import { LEAD_OUTCOMES } from "@/lib/leadOutcomes";
import { TEMPLATE_LANGS, fillTemplate, joinLink, whatsappLink } from "@/lib/leadTemplates";
import { TRADE_LABELS } from "@/lib/trades";
import { LeadWorkPanel } from "./LeadWorkPanel";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getAdminAccess((await auth())?.user?.id);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) notFound();
  const [activities, area, markets, owner] = await Promise.all([
    prisma.leadActivity.findMany({ where: { leadId: id }, orderBy: { createdAt: "desc" }, take: 100 }),
    lead.areaId ? prisma.area.findUnique({ where: { id: lead.areaId }, include: { city: true } }) : null,
    getMarkets({ fresh: true }),
    lead.ownerId ? prisma.user.findUnique({ where: { id: lead.ownerId }, select: { name: true } }) : null,
  ]);
  const zone = markets.find((m) => m.id === lead.zoneId);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "www.servigic.com"}`;
  const trades = (lead.trades.length ? lead.trades : [lead.trade]).map((t) => TRADE_LABELS[t]?.name ?? t);
  const messages = TEMPLATE_LANGS.map((t) => {
    const text = fillTemplate(t.code, { name: lead.personName ?? lead.businessName, trade: trades[0], area: area?.name ?? lead.areaLabel, joinLink: joinLink(origin, lead.refCode) });
    return { code: t.code, label: t.label, text, href: whatsappLink(lead.phone, text) };
  });
  const blocked = lead.doNotContact || lead.status === "DO_NOT_CONTACT";

  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-border-subtle py-1.5 text-sm">
      <span className="text-text-muted">{k}</span>
      <span className="text-end">{v || "—"}</span>
    </div>
  );

  return (
    <div className="max-w-5xl">
      <Link href="/admin/pro-leads" className="text-sm text-text-muted hover:text-text">← All leads</Link>
      <h1 className="mb-1 mt-2 font-display text-3xl font-bold">{lead.personName ?? lead.businessName}</h1>
      <p className="mb-6 text-text-muted" dir="ltr">{access.maskPhones ? maskPhone(lead.phone) : lead.phone}</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="mb-4 rounded-[14px] border border-border-subtle bg-bg-elevated p-4">
            {row("Status", LEAD_STATUS_LABEL[lead.status] ?? lead.status)}
            {row("Trades", trades.join(", "))}
            {row("Other skills", lead.skills)}
            {row("Experience", lead.experienceYears != null ? `${lead.experienceYears} years` : "")}
            {row("Shop / business", lead.businessName !== lead.personName ? lead.businessName : "")}
            {row("Alternate phone", access.maskPhones ? maskPhone(lead.altPhone) : lead.altPhone)}
            {row("Country / city", `${lead.countryCode} / ${area?.city.name ?? lead.city}`)}
            {row("Area", area ? area.name : lead.areaRaw ? `${lead.areaRaw} (not matched yet)` : "")}
            {row("Zone", zone?.name ?? "outside live zones")}
            {row("Address", lead.addressText)}
            {row("Source", [lead.source, ...lead.sources.filter((s) => s !== lead.source)].join(", "))}
            {row("Consent", lead.consent + (lead.consentAt ? ` (${lead.consentAt.toISOString().slice(0, 10)})` : ""))}
            {row("Owner", owner?.name)}
            {row("Registered in app", lead.proUserId ? "yes" : "no")}
            {row("Join link", <span dir="ltr" className="break-all text-xs">{joinLink(origin, lead.refCode)}</span>)}
          </div>
          <h2 className="mb-2 text-lg font-bold">Activity</h2>
          <ul className="flex flex-col gap-2">
            {activities.length === 0 && <li className="text-sm text-text-muted">Nothing yet.</li>}
            {activities.map((a) => (
              <li key={a.id} className="rounded-[10px] border border-border-subtle p-3 text-sm">
                <div className="flex justify-between gap-2 text-xs text-text-muted">
                  <span>{a.kind}{a.outcome ? ` · ${a.outcome}` : ""}</span>
                  <span>{a.createdAt.toISOString().slice(0, 16).replace("T", " ")}{a.adminName ? ` · ${a.adminName}` : ""}</span>
                </div>
                {a.note && <div className="mt-1">{a.note}</div>}
              </li>
            ))}
          </ul>
        </div>
        <LeadWorkPanel
          id={lead.id}
          phone={access.maskPhones ? "" : lead.phone}
          hideContact={access.maskPhones}
          blocked={blocked}
          status={lead.status}
          notes={lead.notes ?? ""}
          followUp={lead.callbackDate ? lead.callbackDate.toISOString().slice(0, 10) : ""}
          consent={lead.consent}
          messages={access.maskPhones ? [] : messages}
          outcomes={LEAD_OUTCOMES.map((o) => ({ key: o.key, label: o.label }))}
        />
      </div>
    </div>
  );
}
