import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { toE164 } from "@/lib/phone";
import { respondEstimate } from "@/lib/bigProjectsFlow";

const schema = z.object({ action: z.enum(["accept", "revise", "decline"]), comment: z.string().trim().max(1000).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  if (parsed.data.action === "revise" && !parsed.data.comment) return NextResponse.json({ error: "Please add a short comment." }, { status: 400 });
  const phone = toE164(auth.session.user.phone ?? "", "PK");
  const est = await prisma.bigProjectEstimate.findFirst({
    where: { status: "sent", project: { id, OR: [{ customerUserId: auth.session.user.id }, ...(phone ? [{ customerPhone: phone }] : [])] } },
    orderBy: { version: "desc" },
    select: { id: true },
  });
  if (!est) return NextResponse.json({ error: "No estimate is waiting for your answer." }, { status: 404 });
  const r = await respondEstimate(est.id, parsed.data.action, parsed.data.comment ?? null);
  return r.ok ? NextResponse.json({ ok: true, status: r.status }) : NextResponse.json({ error: r.error }, { status: 400 });
}
