import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { toE164 } from "@/lib/phone";
import { bigProjectsEnabled } from "@/lib/bigProjects";
import { requestSchema, submitProject } from "@/lib/bigProjectsFlow";

// Customer app: my big projects, and a new request (the account is linked to it).
export async function GET() {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;
  if (!bigProjectsEnabled()) return NextResponse.json({ enabled: false, projects: [] });
  const phone = toE164(auth.session.user.phone ?? "", "PK");
  const rows = await prisma.bigProject.findMany({
    where: { OR: [{ customerUserId: auth.session.user.id }, ...(phone ? [{ customerPhone: phone }] : [])] },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, reference: true, status: true, trades: true, city: true, area: true, createdAt: true, contractAmount: true, currency: true },
  });
  return NextResponse.json({ enabled: true, projects: rows.map((r) => ({ ...r, contractAmount: r.contractAmount ? Number(r.contractAmount) : null })) });
}

export async function POST(req: Request) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;
  if (!bigProjectsEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", field: String(parsed.error.issues[0]?.path[0] ?? "") }, { status: 400 });
  const phone = toE164(parsed.data.phone, "PK");
  if (!phone) return NextResponse.json({ error: "phone", field: "phone" }, { status: 400 });
  const [a, b] = await Promise.all([checkRateLimit(`proj:ip:${clientKey(req)}`, 10, 3600), checkRateLimit(`proj:phone:${phone}`, 3, 86400)]);
  if (!a.ok || !b.ok) return NextResponse.json({ error: "rate" }, { status: 429 });
  const project = await submitProject(parsed.data, { source: "app", userId: auth.session.user.id, ipKey: clientKey(req) });
  return NextResponse.json({ ok: true, reference: project!.reference, id: project!.id });
}
