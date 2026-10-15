import { NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { sendExpoPushChannel } from "@/lib/notify/channels/expoPush";

// "Send me a test job alert" for the Never-miss-a-job setup. The push is sent a few seconds LATER, so the pro can
// lock the phone or swipe the app away first and then see whether the alert really arrives, rings and lights the
// screen - the same push path and channel a real job alert uses (new-job-alert-v3, FCM high priority).
const schema = z.object({ delaySec: z.number().int().min(3).max(60).default(15) });

export async function POST(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { delaySec } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: auth.session.user.id }, select: { fcmTokens: true } });
  if (!user || user.fcmTokens.length === 0) {
    return NextResponse.json({ error: "This phone is not registered for push alerts yet. Allow notifications first.", code: "NO_PUSH_TOKEN" }, { status: 409 });
  }

  const tokens = user.fcmTokens;
  after(async () => {
    await new Promise((r) => setTimeout(r, delaySec * 1000));
    await sendExpoPushChannel({
      tokens,
      title: "New Plumber job - Today (TEST)",
      body: "This is a test alert from Servigic. If you can hear this with the screen off, job alerts will reach you.",
      data: { type: "DISPATCH_ALERT", test: true },
    }).catch((e) => console.error("[test-alert] push failed", e));
  });

  return NextResponse.json({ ok: true, delaySec });
}
