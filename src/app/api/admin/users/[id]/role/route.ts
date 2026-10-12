import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const schema = z.object({ role: z.enum(["ADMIN", "SUPPORT", "CUSTOMER"]) });

// Lets an admin add more reviewers/admins so verification never waits on one
// person. SUPPORT = may only use the Verification queue. Providers are never
// converted into staff here, and nobody can change their own role.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (id === auth.session.user.id) return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role === "PROVIDER") return NextResponse.json({ error: "Provider accounts cannot be made staff" }, { status: 400 });

  const user = await prisma.user.update({ where: { id }, data: { role: parsed.data.role }, select: { id: true, role: true } });
  return NextResponse.json({ user });
}
