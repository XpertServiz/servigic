import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const account = await prisma.account.findUnique({ where: { id }, include: { lines: { take: 1 } } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (account.isSystem) {
    return NextResponse.json({ error: "System accounts (used by auto-posting) can't be deleted" }, { status: 400 });
  }
  if (account.lines.length > 0) {
    return NextResponse.json({ error: "Can't delete an account with posted journal entries" }, { status: 409 });
  }

  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
