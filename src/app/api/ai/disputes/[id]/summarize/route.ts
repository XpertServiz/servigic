import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { summarizeDispute } from "@/lib/aiService";
import { getFeatureFlags } from "@/lib/featureFlags";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const flags = await getFeatureFlags();
  if (!flags.aiDisputeSummarizer) {
    return NextResponse.json({ error: "AI dispute summarizer is disabled" }, { status: 503 });
  }

  const { id } = await params;
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      booking: { include: { job: true, customer: { select: { name: true } }, providerUser: { select: { name: true } } } },
    },
  });
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { bookingId: dispute.bookingId },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { name: true } } },
  });

  const result = await summarizeDispute({
    jobTitle: dispute.booking.job.title,
    reason: dispute.reason,
    customerName: dispute.booking.customer.name,
    providerName: dispute.booking.providerUser.name,
    messages: messages.map((m) => `${m.sender.name}: ${m.body}`),
  });

  if (!result) {
    return NextResponse.json({ error: "AI summarizer is not available right now" }, { status: 503 });
  }
  return NextResponse.json(result);
}
