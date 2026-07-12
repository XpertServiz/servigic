import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { triageJob } from "@/lib/aiService";
import { getFeatureFlags } from "@/lib/featureFlags";

const schema = z.object({ description: z.string().trim().min(5).max(1000) });

export async function POST(req: Request) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const flags = await getFeatureFlags();
  if (!flags.aiJobTriage) {
    return NextResponse.json({ error: "AI triage is disabled" }, { status: 503 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const categories = await prisma.serviceCategory.findMany({ select: { name: true } });
  const result = await triageJob(parsed.data.description, categories.map((c) => c.name));

  if (!result) {
    return NextResponse.json({ error: "AI triage is not available right now" }, { status: 503 });
  }
  return NextResponse.json(result);
}
