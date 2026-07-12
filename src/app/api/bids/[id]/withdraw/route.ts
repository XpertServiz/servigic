import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const bid = await prisma.bid.findUnique({ where: { id }, include: { provider: true } });
  if (!bid || bid.provider.userId !== auth.session.user.id) {
    return NextResponse.json({ error: "Bid not found" }, { status: 404 });
  }
  if (bid.status !== "PENDING" && bid.status !== "COUNTERED") {
    return NextResponse.json({ error: "This bid can no longer be withdrawn" }, { status: 400 });
  }

  const updated = await prisma.bid.update({ where: { id }, data: { status: "WITHDRAWN" } });
  return NextResponse.json({ bid: updated });
}
