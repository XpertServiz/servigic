import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";

const schema = z.object({ accountRef: z.string().trim().max(80).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  const payout = await prisma.payout.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date(), accountRef: parsed.success ? parsed.data.accountRef : undefined },
    include: { provider: true },
  });

  await notify({
    userId: payout.provider.userId,
    type: "PAYOUT_SENT",
    title: "Payout sent 💸",
    body: `PKR ${payout.amountPKR.toLocaleString()} has been sent to your account.`,
    linkUrl: "/pro/earnings",
    channels: ["whatsapp"],
  });

  return NextResponse.json({ payout });
}
