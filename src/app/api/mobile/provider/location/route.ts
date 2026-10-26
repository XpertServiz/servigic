import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

// Where the pro is right now. Sent by the Pro app every few minutes while he is online; job matching uses it together with
// his saved work location (see proServesJob). Ignored while he is offline, and cleared when he goes offline.
const schema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

export async function POST(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  const res = await prisma.providerProfile.updateMany({
    where: { userId: auth.session.user.id, isOnline: true },
    data: { liveLat: parsed.data.lat, liveLng: parsed.data.lng, liveAt: new Date() },
  });
  return NextResponse.json({ ok: res.count > 0 });
}
