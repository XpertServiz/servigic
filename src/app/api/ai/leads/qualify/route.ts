import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { qualifyLeads } from "@/lib/aiService";
import { getFeatureFlags } from "@/lib/featureFlags";

const schema = z.object({ leadIds: z.array(z.string().cuid()).min(1).max(25) });

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const flags = await getFeatureFlags();
  if (!flags.aiLeadQualifier) {
    return NextResponse.json({ error: "AI lead qualification is disabled" }, { status: 503 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const leads = await prisma.lead.findMany({ where: { id: { in: parsed.data.leadIds } } });
  const results = await qualifyLeads(
    leads.map((l) => ({
      id: l.id,
      businessName: l.businessName,
      trade: l.trade,
      city: l.city,
      areaLabel: l.areaLabel,
      rating: l.rating,
      notes: l.notes,
    }))
  );

  if (!results) {
    return NextResponse.json({ error: "AI qualification is not available right now" }, { status: 503 });
  }
  return NextResponse.json({ results });
}
