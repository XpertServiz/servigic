import { NextResponse } from "next/server";
import { getVisitorStats } from "@/lib/visitors";
import { requireRole } from "@/lib/requireRole";

// The visitor counter now lives in the admin dashboard only, so its numbers are no longer public.
export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const stats = await getVisitorStats();
  return NextResponse.json(stats, { headers: { "Cache-Control": "private, no-store" } });
}
