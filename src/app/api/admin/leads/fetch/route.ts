import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { TRADES } from "@/lib/validation/provider";
import { searchPlaces, getPlaceDetails } from "@/lib/googlePlaces";

export const maxDuration = 60;

const schema = z.object({
  trade: z.enum(TRADES),
  city: z.string().trim().min(2),
  searchTerm: z.string().trim().min(2),
  seenPhones: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY is not configured" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { trade, city, searchTerm, seenPhones } = parsed.data;

  const places = await searchPlaces(`${searchTerm} in ${city}, Pakistan`);
  const details = await Promise.all(places.map((p) => getPlaceDetails(p.place_id)));

  const seen = new Set(seenPhones.map((p) => p.replace(/\s+/g, "")));
  const candidates = details
    .filter((d) => d.formatted_phone_number && d.name)
    .map((d) => ({ ...d, phone: d.formatted_phone_number!.replace(/\s+/g, "") }))
    .filter((d) => !seen.has(d.phone));

  const existing = await prisma.lead.findMany({
    where: { phone: { in: candidates.map((c) => c.phone) } },
    select: { phone: true },
  });
  const existingPhones = new Set(existing.map((e) => e.phone));
  const toCreate = candidates.filter((c) => !existingPhones.has(c.phone));

  const result = await prisma.lead.createMany({
    data: toCreate.map((c) => ({
      businessName: c.name!,
      phone: c.phone,
      trade,
      city,
      rating: c.rating,
      source: "GOOGLE_PLACES",
      notes: c.formatted_address,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({
    found: places.length,
    saved: result.count,
    skipped: candidates.length - toCreate.length,
    fetchedPhones: candidates.map((c) => c.phone),
  });
}
