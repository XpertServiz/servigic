import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { parseFilter } from "@/lib/leadFilters";
import { getAdminAccess } from "@/lib/adminAccess";
import { buildExport, type ExportFormat, type ExportResource } from "@/lib/leadExport";

// CSV / XLSX export of the current filter for Pro leads, Pros and the early list. Admin only; every export is
// written to the audit log, and leads marked do-not-contact are always left out.
export async function GET(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  // Only super_admin / growth_admin may export personal data.
  const access = await getAdminAccess(auth.session.user.id);
  if (!access.canExport) return NextResponse.json({ error: "Your admin level cannot export. Ask a super admin." }, { status: 403 });

  const q = new URL(req.url).searchParams;
  const resource = (q.get("resource") ?? "leads") as ExportResource;
  if (!["leads", "pros", "waitlist"].includes(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
  const format: ExportFormat = q.get("format") === "xlsx" ? "xlsx" : "csv";
  const keys = (q.get("cols") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const sp: Record<string, string[]> = {};
  q.forEach((v, k) => {
    (sp[k] ??= []).push(v);
  });

  const out = await buildExport(resource, parseFilter(sp), keys, format, { id: auth.session.user.id, name: auth.session.user.name ?? "admin" });
  return new NextResponse(new Uint8Array(typeof out.body === "string" ? Buffer.from(out.body, "utf8") : out.body), {
    headers: {
      "Content-Type": out.contentType,
      "Content-Disposition": `attachment; filename="${out.filename}"`,
      "Cache-Control": "no-store",
      "X-Row-Count": String(out.rowCount),
    },
  });
}
