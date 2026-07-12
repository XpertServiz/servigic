import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const payouts = await prisma.payout.findMany({
    where: { status: "QUEUED" },
    include: { provider: { include: { user: { select: { name: true, phone: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  const header = "payout_id,provider_name,phone,method,account_ref,amount_pkr,booking_id\n";
  const rows = payouts
    .map((p) =>
      [p.id, p.provider.displayName || p.provider.user.name, p.provider.user.phone, p.provider.payoutMethod ?? p.method, p.provider.payoutAccount ?? p.accountRef ?? "", p.amountPKR, p.bookingId].join(",")
    )
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="servigic-payouts-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
