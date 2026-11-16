import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { rateProject, ratingSchema } from "@/lib/bigProjectsFlow";

// The customer rates a completed project from the private link (no login).
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await checkRateLimit(`rate:${clientKey(req)}`, 10, 3600)).ok) return NextResponse.json({ error: "Too many tries" }, { status: 429 });
  const parsed = ratingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const est = await prisma.bigProjectEstimate.findUnique({ where: { token }, select: { projectId: true } });
  if (!est) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = await rateProject(est.projectId, parsed.data.rating, parsed.data.comment);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 400 });
}
