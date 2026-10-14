import { NextResponse } from "next/server";
import { getVisitorStats } from "@/lib/visitors";

export async function GET() {
  const stats = await getVisitorStats();
  // Short shared cache so a traffic spike can't turn the live panel into a DB hammer.
  return NextResponse.json(stats, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" } });
}
