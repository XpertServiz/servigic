import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

// An admin can cancel a referral that is still waiting for its reward (e.g. spotted abuse by hand).
// Released rewards are never clawed back here - they have already been paid out.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const res = await prisma.referral.updateMany({ where: { id, status: "PENDING" }, data: { status: "REJECTED", rejectReason: "ADMIN_CANCELLED" } });
  if (res.count !== 1) return NextResponse.json({ error: "Only a pending referral can be cancelled" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
