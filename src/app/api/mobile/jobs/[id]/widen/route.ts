import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { dispatchJob } from "@/lib/dispatch";

const STEP_KM = 5;
const MAX_EXTRA_KM = 15;

// Customer taps "Widen search" on a job with no bids (handoff §11.2): the job's radius grows for
// this job only, and pros who were out of range before (and not yet alerted) are pushed now.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.customerId !== auth.session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "OPEN") return NextResponse.json({ error: "This request is no longer open." }, { status: 400 });
  if (job.extraRadiusKm >= MAX_EXTRA_KM) return NextResponse.json({ error: "Your search is already as wide as it can go.", code: "MAX_RADIUS" }, { status: 400 });

  const widened = await prisma.job.update({ where: { id }, data: { extraRadiusKm: job.extraRadiusKm + STEP_KM } });
  const newlyNotified = await dispatchJob(widened, { onlyNew: true });
  const notifiedCount = await prisma.dispatchAlert.count({ where: { jobId: id, pushSent: true } });
  return NextResponse.json({ extraRadiusKm: widened.extraRadiusKm, newlyNotified, notifiedCount });
}
