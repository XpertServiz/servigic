import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ALL_STATUSES, BUDGET_BANDS, PROJECT_TRADES, label } from "@/lib/bigProjectsOptions";

export const dynamic = "force-dynamic";

const SLA_MIN = Number(process.env.PROJECTS_SLA_FIRST_CONTACT_MIN) || 120;
const isLate = (p: { status: string; createdAt: Date }) => p.status === "new" && Date.now() - p.createdAt.getTime() > SLA_MIN * 60000;
const age = (d: Date) => {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
};

export default async function AdminProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = sp.status && (ALL_STATUSES as readonly string[]).includes(sp.status) ? sp.status : undefined;
  const q = (sp.q ?? "").trim();
  const rows = await prisma.bigProject.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ customerName: { contains: q, mode: "insensitive" } }, { customerPhone: { contains: q } }, { reference: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const counts = await prisma.bigProject.groupBy({ by: ["status"], _count: true });
  const waiting = counts.find((c) => c.status === "new")?._count ?? 0;

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Big Projects</h1>
      <p className="mb-6 max-w-3xl text-text-muted">Whole-house requests from the website. You get an email for each one. <b>{waiting}</b> waiting for first contact.</p>
      <form className="mb-4 flex flex-wrap gap-3" action="/admin/projects">
        <input name="q" defaultValue={q} placeholder="Name, phone, reference or city" className="min-h-[44px] w-72 max-w-full rounded-xl border border-border-subtle bg-bg-elevated-2 px-4 text-sm" />
        <select name="status" defaultValue={status ?? ""} className="min-h-[44px] rounded-xl border border-border-subtle bg-bg-elevated-2 px-3 text-sm">
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")} ({counts.find((c) => c.status === s)?._count ?? 0})</option>)}
        </select>
        <button className="min-h-[44px] rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr><th className="p-3">Reference</th><th className="p-3">Customer</th><th className="p-3">Where</th><th className="p-3">Trades</th><th className="p-3">Budget</th><th className="p-3">Status</th><th className="p-3">Age</th><th className="p-3">Contract</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const late = isLate(p);
              return (
                <tr key={p.id} className="border-t border-border-subtle">
                  <td className="p-3 font-semibold"><Link href={`/admin/projects/${p.id}`} className="text-accent underline">{p.reference}</Link>{p.duplicateOf && <span className="ms-2 text-xs text-warning">duplicate?</span>}</td>
                  <td className="p-3">{p.customerName}<div className="text-xs text-text-muted" dir="ltr">{p.customerPhone}</div></td>
                  <td className="p-3 text-text-muted">{[p.area, p.city].filter(Boolean).join(", ")}</td>
                  <td className="p-3 text-text-muted">{p.trades.map((t) => label(PROJECT_TRADES, t)).join(", ")}</td>
                  <td className="p-3 text-text-muted">{label(BUDGET_BANDS, p.budgetBand)}</td>
                  <td className="p-3">{p.status.replaceAll("_", " ")}</td>
                  <td className={`p-3 ${late ? "font-bold text-danger" : "text-text-muted"}`}>{age(p.createdAt)}</td>
                  <td className="p-3 text-text-muted">{p.contractAmount ? `${p.currency} ${Number(p.contractAmount).toLocaleString()}` : "-"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-text-muted">No projects yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
