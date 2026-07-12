import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { locationPingSchema } from "@/lib/validation/booking";

// Provider app sends a ping every 30–60s while ON_MY_WAY only (battery + privacy + zero cost).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = locationPingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.providerUserId !== auth.session.user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "ON_MY_WAY") {
    return NextResponse.json({ error: "Location sharing only active while on the way" }, { status: 400 });
  }

  const ping = await prisma.locationPing.create({
    data: { bookingId: id, lat: parsed.data.lat, lng: parsed.data.lng },
  });

  return NextResponse.json({ ping });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER", "PROVIDER", "ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (auth.session.user.role !== "ADMIN" && booking.customerId !== auth.session.user.id && booking.providerUserId !== auth.session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const latest = await prisma.locationPing.findFirst({ where: { bookingId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ping: latest });
}
