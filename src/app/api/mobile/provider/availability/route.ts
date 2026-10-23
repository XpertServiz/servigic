import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { availabilitySchema, normalizeAvailability, parseAvailability, type Availability } from "@/lib/availability";

// A pro's working hours: several windows per weekday, added, changed or removed freely. null = always available.
export async function GET() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;
  const p = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id }, select: { availability: true } });
  return NextResponse.json({ availability: parseAvailability(p?.availability) });
}

const body = z.object({ availability: availabilitySchema.nullable() });

export async function PUT(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid working hours" }, { status: 400 });
  const value = parsed.data.availability ? normalizeAvailability(parsed.data.availability as Availability) : null;
  if (value && Object.values(value).every((w) => w.length === 0)) {
    return NextResponse.json({ error: "Add at least one time window, or choose Always available." }, { status: 400 });
  }
  await prisma.providerProfile.update({ where: { userId: auth.session.user.id }, data: { availability: value ?? Prisma.DbNull } });
  return NextResponse.json({ availability: value });
}
