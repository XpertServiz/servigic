import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { AD_DISCOUNT_WEEKLY_LIMIT, adDiscountAmount, getAdDiscountState } from "@/lib/rewards";

export async function GET() {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;
  return NextResponse.json(await getAdDiscountState(auth.session.user.id));
}

// Called by the Customer app after the user opts in and finishes a rewarded ad.
// The weekly cap is checked and the credit created in one serializable
// transaction, so rapid repeat calls can't slip past the limit. (The reward
// itself is trusted from the client - AdMob server-side verification needs a
// callback URL in the AdMob console - which is exactly why the value is a small
// flat amount with a hard server-side cap.)
export async function POST() {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;
  const customerId = auth.session.user.id;
  // In the customer's own currency (about PKR 50 worth: SAR 3, CAD 3...).
  const rewardAmount = await adDiscountAmount(customerId);

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let created: { id: string; amountPKR: number } | null;
  try {
    created = await prisma.$transaction(
      async (tx) => {
        const earned = await tx.rewardCredit.count({ where: { customerId, kind: "AD_DISCOUNT", earnedAt: { gte: since } } });
        if (earned >= AD_DISCOUNT_WEEKLY_LIMIT) return null;
        return tx.rewardCredit.create({ data: { customerId, kind: "AD_DISCOUNT", amountPKR: rewardAmount } });
      },
      { isolationLevel: "Serializable" }
    );
  } catch (e) {
    // P2034 = two requests collided in the serializable transaction; one of them
    // already won, so this one is simply over the limit / should retry.
    if ((e as { code?: string }).code === "P2034") created = null;
    else throw e;
  }

  const state = await getAdDiscountState(customerId);
  if (!created) {
    return NextResponse.json(
      { error: `You have already earned ${AD_DISCOUNT_WEEKLY_LIMIT} ad rewards this week.`, code: "REWARD_LIMIT", ...state },
      { status: 429 }
    );
  }
  return NextResponse.json({ credit: { id: created.id, amountPKR: created.amountPKR }, ...state });
}
