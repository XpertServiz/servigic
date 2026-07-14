import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { messageSchema } from "@/lib/validation/booking";
import { notify } from "@/lib/notify";

// COMPLETED is deliberately excluded — once the customer confirms the job
// is done, the relationship is over and messaging locks, matching Trust &
// Safety's "chat unlocks after payment" / closes-on-completion model.
// DISPUTED stays unlocked — that's exactly when both sides need to keep
// talking (and where admin relays its resolution into this same thread).
const UNLOCKED_STATUSES = ["CONFIRMED", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE", "DISPUTED"];

async function loadParticipantBooking(id: string, userId: string, role: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
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

  // Admin can always relay into the thread (e.g. posting a dispute
  // resolution onto an already-CANCELLED booking) — the lock only applies
  // to the two participants.
  if (auth.session.user.role !== "ADMIN" && !UNLOCKED_STATUSES.includes(booking.status)) {
    return NextResponse.json({ error: "Chat is locked until payment is verified and the job is confirmed." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Message required" }, { status: 400 });

  // Chat only opens after payment confirms the relationship, so contact info
  // is already unlocked by then — no need to scrub here (unlike bid messages).
  const message = await prisma.message.create({
    data: { bookingId: id, senderId: auth.session.user.id, body: parsed.data.body },
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
      })
    )
  );

  return NextResponse.json({ message });
}
