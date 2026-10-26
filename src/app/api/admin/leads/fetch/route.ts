import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { TRADES } from "@/lib/validation/provider";
import { searchLeads, PlacesError } from "@/lib/googlePlaces";

export const maxDuration = 60;

const schema = z.object({
  trade: z.enum(TRADES),
  country: z.string().trim().min(2).default("Pakistan"),
  city: z.string().trim().min(2),
  area: z.string().trim().max(80).optional().default(""),
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
  const { trade, country, city, area, searchTerm, seenPhones } = parsed.data;

  // e.g. "plumber in Aziziyah, Madinah, Saudi Arabia": an area narrows the search to that neighbourhood.
  let found;
  try {
    found = await searchLeads(`${searchTerm} in ${area ? `${area}, ` : ""}${city}, ${country}`);
  } catch (e) {
    // Google's own reason (for example "enable billing"), instead of a silent "0 results".
    if (e instanceof PlacesError) return NextResponse.json({ error: e.message }, { status: 502 });
    throw e;
  }

  const seen = new Set(seenPhones.map((p) => p.replace(/\s+/g, "")));
  const candidates = found.filter((d) => !seen.has(d.phone));

  const existing = await prisma.lead.findMany({
    where: { phone: { in: candidates.map((c) => c.phone) } },
    select: { phone: true },
  });
  const existingPhones = new Set(existing.map((e) => e.phone));
  const toCreate = candidates.filter((c) => !existingPhones.has(c.phone));

  const result = await prisma.lead.createMany({
    data: toCreate.map((c) => ({
      businessName: c.name,
      phone: c.phone,
      trade,
      city,
      areaLabel: area || null,
      rating: c.rating,
      source: "GOOGLE_PLACES",
      notes: c.address,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({
    found: found.length,
    saved: result.count,
    skipped: candidates.length - toCreate.length,
    fetchedPhones: candidates.map((c) => c.phone),
  });
}
