import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { respondEstimate } from "@/lib/bigProjectsFlow";

const schema = z.object({ action: z.enum(["accept", "revise", "decline"]), comment: z.string().trim().max(1000).optional() });

// The customer answers an estimate from the private link in the email (no login).
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await checkRateLimit(`est:${clientKey(req)}`, 20, 3600)).ok) return NextResponse.json({ error: "Too many tries" }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const est = await prisma.bigProjectEstimate.findUnique({ where: { token }, select: { id: true } });
  if (!est) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (parsed.data.action === "revise" && !parsed.data.comment) return NextResponse.json({ error: "Please add a short comment." }, { status: 400 });
  const r = await respondEstimate(est.id, parsed.data.action, parsed.data.comment ?? null);
  return r.ok ? NextResponse.json({ ok: true, status: r.status }) : NextResponse.json({ error: r.error }, { status: 400 });
}
