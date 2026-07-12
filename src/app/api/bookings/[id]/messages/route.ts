import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { messageSchema } from "@/lib/validation/booking";

const UNLOCKED_STATUSES = ["CONFIRMED", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE", "COMPLETED"];

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
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const booking = await loadParticipantBooking(id, auth.session.user.id, auth.session.user.role);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!UNLOCKED_STATUSES.includes(booking.status)) {
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

  return NextResponse.json({ message });
}
