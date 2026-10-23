import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { keepRequestOpen, KEEP_OPEN_DAYS } from "@/lib/requestLifecycle";

// "Keep my request open": 7 more days for an open request, or reopen one that closed without a pro.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const res = await keepRequestOpen(id, auth.session.user.id);
  if (!res.ok) return NextResponse.json({ error: res.error, code: res.code }, { status: res.status });
  return NextResponse.json({ ok: true, biddingClosesAt: res.biddingClosesAt, reopened: res.reopened, days: KEEP_OPEN_DAYS });
}
