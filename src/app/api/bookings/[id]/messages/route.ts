import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { messageSchema } from "@/lib/validation/booking";
import { notify } from "@/lib/notify";
import { computeRevealStage } from "@/lib/reveal";
import { scrubContactInfo } from "@/lib/scrub";

async function loadParticipantBooking(id: string, userId: string, role: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: { job: { select: { urgency: true } } } });
  if (!booking) return null;
  if (role !== "ADMIN" && booking.customerId !== userId && booking.providerUserId !== userId) return null;
  return booking;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER", "PROVIDER", "ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const booking = await loadParticipantBooking(id, auth.session.user.id, auth.session.user.role);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { bookingId: id },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { name: true, role: true } } },
  });
  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER", "PROVIDER", "ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const booking = await loadParticipantBooking(id, auth.session.user.id, auth.session.user.role);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const revealStage = computeRevealStage(booking.status, booking.job.urgency);
  // Chat now opens at MASKED (v7 §2.2) — CONFIRMED onward — not just once
  // fully unlocked. COMPLETED is deliberately excluded even though it's a
  // FULL-reveal status: once the customer confirms the job is done, the
  // relationship is over and messaging locks. Admin can always relay into
  // the thread (e.g. posting a dispute resolution) — the lock only applies
  // to the two participants.
  const chatOpen = revealStage !== "LOCKED" && booking.status !== "COMPLETED";
  if (auth.session.user.role !== "ADMIN" && !chatOpen) {
    return NextResponse.json({ error: "Chat is locked until the job is confirmed." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Message required" }, { status: 400 });

  // Masked stage: redact phone/email/whatsapp mentions the same way bid
  // messages already are, since contact isn't revealed yet at this stage
  // (non-emergency bookings between CONFIRMED and ON_MY_WAY). Full reveal
  // means there's nothing left to hide, so skip scrubbing once there.
  const rawBody = parsed.data.body;
  const safeBody = revealStage === "MASKED" ? scrubContactInfo(rawBody) : rawBody;
  const message = await prisma.message.create({
    data: { bookingId: id, senderId: auth.session.user.id, body: safeBody, scrubHit: safeBody !== rawBody },
  });

  // Notify whichever side(s) didn't send this message — admin posting a
  // dispute update goes to both the customer and the provider; either of
  // them messaging goes to the other one.
  const recipientIds = [booking.customerId, booking.providerUserId].filter((uid) => uid !== auth.session.user.id);
  await Promise.allSettled(
    recipientIds.map((userId) =>
      notify({
        userId,
        type: "STATUS_UPDATE",
        title: auth.session.user.role === "ADMIN" ? "Message from Servigic support" : "New message",
        body: parsed.data.body.slice(0, 100),
        linkUrl: `/bookings/${id}`,
        pushChannelHint: "MESSAGE",
      })
    )
  );

  return NextResponse.json({ message });
}
