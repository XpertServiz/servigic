import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { ALL_STATUSES } from "@/lib/bigProjectsOptions";

// Admin: all (or one status of) big projects as a CSV file. Cells starting with = + - @ are prefixed so spreadsheets do not run them as formulas.
const cell = (v: unknown) => {
  let t = v instanceof Date ? v.toISOString() : String(v ?? "");
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return `"${t.replaceAll('"', '""')}"`;
};

export async function GET(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const st = new URL(req.url).searchParams.get("status");
  const rows = await prisma.bigProject.findMany({ where: st && (ALL_STATUSES as readonly string[]).includes(st) ? { status: st } : {}, orderBy: { createdAt: "desc" }, take: 5000 });
  const head = ["reference", "status", "created", "name", "phone", "email", "city", "area", "trades", "type", "stage", "sqft", "floors", "budget", "start", "contract_amount", "currency", "site_visit", "source"];
  const lines = [head.join(",")].concat(rows.map((p) => [p.reference, p.status, p.createdAt, p.customerName, p.customerPhone, p.customerEmail, p.city, p.area, p.trades.join(" "), p.projectType, p.propertyStage, p.areaSqft, p.floors, p.budgetBand, p.startWindow, p.contractAmount ? Number(p.contractAmount) : "", p.currency, p.siteVisitAt, p.source].map(cell).join(",")));
  return new Response(lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="big-projects-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
