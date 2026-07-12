import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";

const schema = z.object({ verificationLevel: z.number().int().min(0).max(3) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const profile = await prisma.providerProfile.update({
    where: { id },
    data: {
      verificationLevel: parsed.data.verificationLevel,
      isVerified: parsed.data.verificationLevel >= 1,
      verifiedAt: parsed.data.verificationLevel >= 1 ? new Date() : null,
    },
  });

  await notify({
    userId: profile.userId,
    type: "SYSTEM",
    title: "Verification status updated",
    body:
      parsed.data.verificationLevel >= 1
        ? `You're now Level ${parsed.data.verificationLevel} verified — you can start bidding on jobs.`
        : "Your verification was reset. Please check your documents and resubmit.",
    linkUrl: "/pro/profile",
    channels: ["whatsapp"],
  });

  return NextResponse.json({ profile });
}
