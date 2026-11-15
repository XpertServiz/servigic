import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BUDGET_BANDS, PROJECT_TRADES, PROJECT_TYPES, PROPERTY_STAGES, START_WINDOWS, label } from "@/lib/bigProjectsOptions";
import { ProjectActions } from "./ProjectActions";
import { ProjectFlow } from "./ProjectFlow";

export const dynamic = "force-dynamic";

export default async function AdminProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.bigProject.findUnique({ where: { id }, include: { events: { orderBy: { createdAt: "desc" } }, estimates: { orderBy: { version: "asc" } }, assignments: { orderBy: { invitedAt: "asc" } }, milestones: { orderBy: { dueDate: "asc" } } } });
  if (!p) notFound();
  const pros = await prisma.providerProfile.findMany({ where: { isVerified: true }, select: { id: true, displayName: true, trades: true }, orderBy: { displayName: "asc" }, take: 300 });
  const proName = (pid: string) => pros.find((x) => x.id === pid)?.displayName ?? "Pro";
  const wa = `https://wa.me/${p.customerPhone.replace(/\D/g, "")}`;
  const rows: [string, string][] = [
    ["Trades", p.trades.map((t) => label(PROJECT_TRADES, t)).join(", ")],
    ["Project", `${label(PROJECT_TYPES, p.projectType)} / ${label(PROPERTY_STAGES, p.propertyStage)}`],
    ["Where", [p.area, p.city].filter(Boolean).join(", ")],
    ["Size", p.areaSqft ? `${p.areaSqft} sq ft${p.floors ? `, ${p.floors} floor(s)` : ""}` : "-"],
    ["Budget", label(BUDGET_BANDS, p.budgetBand)],
    ["Start", label(START_WINDOWS, p.startWindow)],
    ["Contact via", `${p.preferredContact ?? "-"} / ${p.bestTime ?? "-"}`],
    ["Email", p.customerEmail],
    ["Notes", p.notes || "-"],
    ["Submitted", p.createdAt.toLocaleString()],
  ];
  return (
    <div className="max-w-4xl">
      <Link href="/admin/projects" className="text-sm text-accent underline">All projects</Link>
      <h1 className="mb-1 mt-2 font-display text-3xl font-bold">{p.reference} <span className="text-lg font-normal text-text-muted">{p.status.replaceAll("_", " ")}</span></h1>
      <p className="mb-4 text-text-muted">{p.customerName} - <span dir="ltr">{p.customerPhone}</span></p>
      {p.duplicateOf && <p className="mb-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">Possible duplicate: <Link className="underline" href={`/admin/projects/${p.duplicateOf}`}>earlier request</Link> from the same phone, city and trade in the last 7 days.</p>}
      <div className="mb-6 flex flex-wrap gap-2">
        <a href={`tel:${p.customerPhone}`} className="min-h-[44px] rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground">Call</a>
        <a href={wa} target="_blank" rel="noopener noreferrer" className="min-h-[44px] rounded-full border border-accent px-5 py-3 text-sm font-semibold text-accent">WhatsApp</a>
        <a href={`mailto:${p.customerEmail}`} className="min-h-[44px] rounded-full border border-border-subtle px-5 py-3 text-sm font-semibold">Email</a>
      </div>
      <div className="mb-6 rounded-[14px] border border-border-subtle bg-bg-elevated p-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[150px_1fr]">
          {rows.map(([k, v]) => (<div key={k} className="contents"><dt className="text-text-muted">{k}</dt><dd>{v}</dd></div>))}
        </dl>
      </div>
      <ProjectActions
        id={p.id}
        status={p.status}
        contractAmount={p.contractAmount ? Number(p.contractAmount) : null}
        warrantyDays={p.warrantyDays}
        currency={p.currency}
        siteVisitAt={p.siteVisitAt ? p.siteVisitAt.toISOString().slice(0, 16) : ""}
        siteVisitNotes={p.siteVisitNotes ?? ""}
      />
      <ProjectFlow
        id={p.id}
        currency={p.currency}
        estimates={p.estimates.map((e) => ({ id: e.id, version: e.version, status: e.status, total: Number(e.total), sentAt: e.sentAt.toISOString() }))}
        pros={pros.map((x) => ({ id: x.id, name: x.displayName, trades: x.trades.map(String) }))}
        assignments={p.assignments.map((a) => ({ id: a.id, proName: proName(a.proId), role: a.role, scope: a.scope, payout: Number(a.payoutAmount), status: a.status }))}
        milestones={p.milestones.map((m) => ({ id: m.id, title: m.title, status: m.status, amount: m.amount ? Number(m.amount) : null, assignmentId: m.assignmentId, photos: m.photos, note: m.readyNote }))}
      />
      <h2 className="mb-3 mt-8 text-lg font-bold">Timeline</h2>
      <ul className="flex flex-col gap-2 text-sm">
        {p.events.map((e) => (
          <li key={e.id} className="rounded-xl border border-border-subtle p-3">
            <span className="text-xs uppercase tracking-wide text-text-muted">{e.type} - {e.createdAt.toLocaleString()}</span>
            {e.body && <p className="mt-1 whitespace-pre-wrap">{e.body}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
