import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { toE164 } from "@/lib/phone";
import { customerProjectView } from "@/lib/bigProjectsFlow";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const phone = toE164(auth.session.user.phone ?? "", "PK");
  const own = await prisma.bigProject.findFirst({ where: { id, OR: [{ customerUserId: auth.session.user.id }, ...(phone ? [{ customerPhone: phone }] : [])] }, select: { id: true } });
  if (!own) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project: await customerProjectView(id) });
}
