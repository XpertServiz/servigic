import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { isAwaitingReview, listReviewStaff, VERIFICATION_SLA_HOURS } from "@/lib/staff";

// Called hourly by .github/workflows/verification-sla.yml. Any Pro submission
// still unreviewed after 24 h is escalated once: every admin/reviewer gets the
// same notify() alert the rest of the system uses (in-app + push, plus
// email / WhatsApp / SMS wherever those channels are configured).
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - VERIFICATION_SLA_HOURS * 60 * 60 * 1000);
  const candidates = await prisma.providerProfile.findMany({
    where: { isVerified: false, verificationLevel: 0, verificationEscalatedAt: null, verificationSubmittedAt: { lt: cutoff } },
    select: {
      id: true,
      displayName: true,
      isVerified: true,
      verificationLevel: true,
      cnicUrl: true,
      cnicBackUrl: true,
      selfieUrl: true,
      verificationSubmittedAt: true,
      verificationRejectedAt: true,
    },
  });
  const overdue = candidates.filter(isAwaitingReview);
  if (overdue.length === 0) return NextResponse.json({ escalated: 0 });

  const staff = await listReviewStaff();
  const names = overdue
    .slice(0, 5)
    .map((p) => p.displayName)
    .join(", ");
  await Promise.allSettled(
    staff.map((s) =>
      notify({
        userId: s.id,
        type: "SYSTEM",
        title: `${overdue.length} Pro verification${overdue.length === 1 ? "" : "s"} waiting over ${VERIFICATION_SLA_HOURS}h`,
        body: `${names}${overdue.length > 5 ? " and more" : ""} - please review in the Verification queue.`,
        linkUrl: "/admin/verification",
        channels: ["email", "whatsapp", "sms"],
      })
    )
  );

  await prisma.providerProfile.updateMany({
    where: { id: { in: overdue.map((p) => p.id) } },
    data: { verificationEscalatedAt: new Date() },
  });
  return NextResponse.json({ escalated: overdue.length, notifiedStaff: staff.length });
}
