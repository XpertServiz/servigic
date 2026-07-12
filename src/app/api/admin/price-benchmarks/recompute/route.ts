import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { recomputePriceBenchmarks } from "@/lib/priceBenchmark";

export async function POST() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const count = await recomputePriceBenchmarks();
  return NextResponse.json({ count });
}
