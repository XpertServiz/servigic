import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { getReferralSummary } from "@/lib/referrals";

// The signed-in customer's or pro's referral card: their code, what a successful invite is worth, progress of
// the friends they invited, and what they have earned so far (their referral earnings "wallet").
export async function GET() {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;
  const summary = await getReferralSummary(auth.session.user.id, auth.session.user.role);
  return NextResponse.json(summary);
}
