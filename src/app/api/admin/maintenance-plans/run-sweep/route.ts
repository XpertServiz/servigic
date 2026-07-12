import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { runMaintenancePlanSweep } from "@/lib/maintenancePlans";

export async function POST() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const count = await runMaintenancePlanSweep();
  return NextResponse.json({ count });
}
