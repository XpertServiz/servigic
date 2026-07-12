import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const BASE_URL = process.env.AI_SERVICE_URL;
const INTERNAL_KEY = process.env.INTERNAL_AI_SERVICE_KEY;

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  if (!BASE_URL) {
    return NextResponse.json({ forecast: [], isHeuristic: true, unavailable: true });
  }

  const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const jobs = await prisma.job.findMany({
    where: { createdAt: { gte: sinceDate } },
    select: { city: true, createdAt: true, category: { select: { name: true } } },
  });

  const buckets = new Map<string, { city: string; hourOfDay: number; category: string; jobCount: number }>();
  for (const job of jobs) {
    const hourOfDay = job.createdAt.getHours();
    const key = `${job.city}|${hourOfDay}|${job.category.name}`;
    const existing = buckets.get(key);
    if (existing) existing.jobCount += 1;
    else buckets.set(key, { city: job.city, hourOfDay, category: job.category.name, jobCount: 1 });
  }

  try {
    const res = await fetch(`${BASE_URL}/ml/demand-heatmap`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Key": INTERNAL_KEY ?? "" },
      body: JSON.stringify({ history: Array.from(buckets.values()) }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return NextResponse.json({ forecast: [], isHeuristic: true, unavailable: true });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ forecast: [], isHeuristic: true, unavailable: true });
  }
}
