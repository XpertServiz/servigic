import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { toE164 } from "@/lib/phone";
import { rateProject, ratingSchema } from "@/lib/bigProjectsFlow";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = ratingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const phone = toE164(auth.session.user.phone ?? "", "PK");
  const mine = await prisma.bigProject.findFirst({ where: { id, OR: [{ customerUserId: auth.session.user.id }, ...(phone ? [{ customerPhone: phone }] : [])] }, select: { id: true } });
  if (!mine) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = await rateProject(id, parsed.data.rating, parsed.data.comment);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 400 });
}
