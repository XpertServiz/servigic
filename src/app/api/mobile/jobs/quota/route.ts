import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { MAX_OPEN_REQUESTS, openRequestCount } from "@/lib/requestLifecycle";

// How many requests the customer has open and how many more can be posted (the counter on Post a Job and My Jobs).
export async function GET() {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;
  const open = await openRequestCount(auth.session.user.id);
  return NextResponse.json({ open, max: MAX_OPEN_REQUESTS, remaining: Math.max(0, MAX_OPEN_REQUESTS - open) });
}
