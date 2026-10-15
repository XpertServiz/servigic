import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";
import { evaluateProActivation } from "@/lib/proActivation";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(3, "Give the pro a reason").max(300) }),
]);

// One-tap manual review of a Pro's CNIC + selfie. The OCR fields only save the
// reviewer typing - approval is always this human action, never automatic.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN", "SUPPORT");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const existing = await prisma.providerProfile.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  if (!existing.cnicUrl || !existing.selfieUrl) {
    return NextResponse.json({ error: "This provider has not submitted both documents" }, { status: 400 });
  }

  const now = new Date();
  const reviewer = { verificationReviewedAt: now, verificationReviewedById: auth.session.user.id };

  if (parsed.data.action === "approve") {
    const profile = await prisma.providerProfile.update({
      where: { id },
      data: {
        ...reviewer,
        verificationLevel: Math.max(existing.verificationLevel, 1),
        isVerified: true,
        verifiedAt: existing.verifiedAt ?? now,
        verificationRejectedAt: null,
        verificationRejectedReason: null,
      },
    });
    // Supply/demand balance: approved pros start ACTIVE only if their area/trade is open and under its cap.
    const activation = await evaluateProActivation(profile.id).catch(() => "ACTIVE" as const);
    await notify({
      userId: profile.userId,
      type: "SYSTEM",
      title: activation === "ACTIVE" ? "You are verified" : "You are approved - we will let you know when jobs open",
      body:
        activation === "ACTIVE"
          ? "Your documents were approved - you can now receive job alerts and bid on jobs."
          : "Your documents were approved. Jobs have not opened for your area or trade yet - we will notify you the moment they do.",
      linkUrl: "/pro/profile",
      channels: ["whatsapp"],
    });
    return NextResponse.json({ profile, activation });
  }

  const profile = await prisma.providerProfile.update({
    where: { id },
    data: { ...reviewer, verificationRejectedAt: now, verificationRejectedReason: parsed.data.reason },
  });
  await notify({
    userId: profile.userId,
    type: "SYSTEM",
    title: "Verification needs another look",
    body: `We could not approve your documents: ${parsed.data.reason}. Please upload them again.`,
    linkUrl: "/pro/profile",
    channels: ["whatsapp"],
  });
  return NextResponse.json({ profile });
}
