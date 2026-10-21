import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { ADMIN_LEVELS, getAdminAccess } from "@/lib/adminAccess";

const schema = z.object({ level: z.enum(ADMIN_LEVELS) });

// Staff level of an admin: super_admin and growth_admin may export and see full phone numbers, "admin" sees masked numbers.
// Only a super admin changes levels, and nobody changes their own (so the last super admin cannot lock everyone out).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  if (!(await getAdminAccess(auth.session.user.id)).canExport || (await getAdminAccess(auth.session.user.id)).level !== "super_admin") {
    return NextResponse.json({ error: "Only a super admin can change admin levels" }, { status: 403 });
  }
  const { id } = await params;
  if (id === auth.session.user.id) return NextResponse.json({ error: "You cannot change your own level" }, { status: 400 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid level" }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target || target.role !== "ADMIN") return NextResponse.json({ error: "Only admin accounts have a level" }, { status: 400 });
  await prisma.user.update({ where: { id }, data: { adminLevel: parsed.data.level } });
  return NextResponse.json({ ok: true });
}
