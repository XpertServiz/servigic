import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { dispatchJob } from "@/lib/dispatch";

// Admin concierge matching (handoff §11.2): during the early weeks an admin can hand an unmatched open
// job to a specific pro. The pro gets the normal job alert (bypassing pause/quiet hours/daily cap,
// since a human asked) and still bids as usual.
const schema = z.object({ providerId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Pick a pro" }, { status: 400 });

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.status !== "OPEN") return NextResponse.json({ error: "This job is no longer open" }, { status: 400 });

  const pro = await prisma.providerProfile.findUnique({ where: { id: parsed.data.providerId }, select: { id: true, isVerified: true, activation: true } });
  if (!pro || !pro.isVerified) return NextResponse.json({ error: "That pro is not verified" }, { status: 400 });
  if (pro.activation !== "ACTIVE") return NextResponse.json({ error: "That pro is still waiting for their area to open" }, { status: 400 });

  // Radius/geohash do not apply to a hand-picked pro, so alert directly.
  const alerted = await dispatchJob({ ...job, extraRadiusKm: 500 }, { onlyProviderId: pro.id, force: true });
  return NextResponse.json({ ok: true, alerted });
}
