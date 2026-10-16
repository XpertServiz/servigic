import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const topUp = await prisma.topUp.findUnique({
    where: { id },
    include: { wallet: { include: { provider: { include: { user: { select: { id: true } } } } } } },
  });
  if (!topUp || topUp.status !== "SUBMITTED") {
    return NextResponse.json({ error: "Top-up not awaiting verification" }, { status: 400 });
  }

  // The admin can say WHY (wrong amount, unreadable screenshot, payment not received ...); the pro sees it.
  const reason = String(((await req.json().catch(() => ({}))) as { reason?: string }).reason ?? "").trim().slice(0, 200);
  await prisma.topUp.update({ where: { id }, data: { status: "REJECTED" } });

  await notify({
    userId: topUp.wallet.provider.user.id,
    type: "SYSTEM",
    title: "Top-up rejected",
    body: reason ? `We could not verify your top-up: ${reason}. Please submit it again.` : "We couldn't verify your top-up proof - please resubmit with a clearer screenshot.",
    linkUrl: "/pro/earnings",
    channels: ["whatsapp"],
  });

  return NextResponse.json({ ok: true });
}
