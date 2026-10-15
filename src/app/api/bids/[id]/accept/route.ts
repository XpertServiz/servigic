import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { acceptBid } from "@/lib/acceptBid";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await acceptBid(id, auth.session.user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ booking: result.booking });
}
